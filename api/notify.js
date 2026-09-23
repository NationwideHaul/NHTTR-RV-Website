// ─────────────────────────────────────────────────────────────
// POST /api/notify — website lead forms (service requests).
//
// Shared by both NH repair sites (nhtrucktrailerrepair.com and
// nhrvrepair.com). Every lead is stored in Supabase table `nhttr_leads`
// (the `site` column says which website it came from), then emailed via
// Resend to the service team with marketing CC'd.
//
// Env vars (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY             required to send the email
//   RESEND_FROM                e.g. "NH Repair Website <no-reply@notify.nationwidehaul.com>"
//   SUPABASE_URL               https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  sb_secret_… (server-only)
//   TURNSTILE_SECRET_KEY       Cloudflare Turnstile (fail-open until set)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  optional, reliable rate limiting
// ─────────────────────────────────────────────────────────────
import { insertRow } from './_lib/supabase.js';
import {
  validateEmail, verifyTurnstile, rateLimit, clientIp
} from './_lib/antispam.js';

const TO = 'lakelandservice@nationwidehaul.com';
const CC = ['marketing@nationwidehaul.com'];

const SITES = {
  'nhtrucktrailerrepair.com': { name: 'NH Truck & Trailer Repair', subject: 'New Service Request — NH Truck & Trailer Repair Website' },
  'nhrvrepair.com':           { name: 'NH RV & Bus Repair',        subject: 'New Service Request — NH RV Repair Website' }
};
// Other hosts that serve one of the sites (aliases / previews / local).
const ALIASES = { 'nationwidehauldealer.com': 'nhtrucktrailerrepair.com' };
// Fallback when the request comes from a preview/local host.
const DEFAULT_SITE = process.env.SITE_DOMAIN || 'nhrvrepair.com';

const MIN_ELAPSED_MS = 3000;
const MAX_PER_HOUR = 5;
const MAX_FIELD_LEN = 5000;

function hostOf(req) {
  try { return new URL(req.headers.origin || req.headers.referer || '').hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function siteFor(host) {
  if (SITES[host]) return host;
  if (ALIASES[host]) return ALIASES[host];
  return null;
}

function originAllowed(host) {
  return !!siteFor(host) || host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1';
}

// Normalize the two sites' different field names into one shape.
function pick(body, ...keys) {
  for (const k of keys) if (body[k] != null && String(body[k]).trim() !== '') return String(body[k]).trim();
  return null;
}

const LINK_RE = /(https?:\/\/|www\.|\[url|<a\s|\.(ru|cn|xyz|top|click|site|online|shop)\b)/gi;
const FOREIGN_SCRIPT_RE = /[Ѐ-ӿ؀-ۿ฀-๿぀-ヿ一-鿿가-힯]/;
const SPAM_WORDS_RE = /\b(seo|backlinks?|crypto|bitcoin|casino|viagra|cialis|porn|loan offer|web ?design services|rank (your|higher)|guest post|increase (your )?traffic|lead generation services)\b/i;

function looksRandom(word) {
  return (String(word).match(/[a-z][A-Z]/g) || []).length >= 3;
}

// Returns a reason when the content looks like spam. Flagged leads are
// still saved (status 'spam') but NOT emailed, so false positives can be
// recovered from Supabase.
function spamReason(lead, allText) {
  if (lead.full_name && (lead.full_name.match(LINK_RE) || []).length) return 'link_in_name';
  if ((String(lead.message || '').match(LINK_RE) || []).length >= 2) return 'links_in_message';
  if (FOREIGN_SCRIPT_RE.test(allText)) return 'foreign_script';
  if (SPAM_WORDS_RE.test(lead.message || '')) return 'spam_keywords';
  if (lead.full_name && lead.full_name.split(/\s+/).some(looksRandom)) return 'random_name';
  return null;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderEmail(siteName, subject, rows) {
  const tr = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#888;width:160px;vertical-align:top;font-size:13px;">${escapeHtml(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#1a1a1a;font-size:14px;">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:32px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="background:#1a1a1a;color:#fff;padding:24px 28px;">
        <div style="display:inline-block;background:#c8181f;color:#fff;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;">New Lead — ${escapeHtml(siteName)}</div>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff;">${escapeHtml(subject)}</h1>
      </div>
      <table style="width:100%;border-collapse:collapse;">${tr}</table>
      <div style="background:#fafafa;padding:16px 28px;border-top:1px solid #eee;font-size:11px;color:#999;">
        Reply to this email to answer the customer directly.
      </div>
    </div>
  </body></html>`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  body = body || {};

  // Hard bot signals return a fake 200 so bots can't tell they were caught.
  const drop = (reason) => {
    console.log('notify: dropped bot submission —', reason);
    return res.status(200).json({ ok: true });
  };

  // ── Layer 1: Origin — must come from one of our sites. ──
  const host = hostOf(req);
  if (!originAllowed(host)) return drop('bad_origin');
  const site = siteFor(host) || DEFAULT_SITE;
  const cfg = SITES[site];

  // ── Layer 2: Honeypot. ──
  if ((body._honey && String(body._honey).trim()) || (body._hp && String(body._hp).trim())) return drop('honeypot');

  // ── Layer 3: Time-trap (missing or near-instant). ──
  const elapsed = Number(body.elapsed_ms);
  if (!Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) return drop('too_fast');

  const ip = clientIp(req);

  // ── Layer 4: Cloudflare Turnstile. ──
  const captcha = await verifyTurnstile(body['cf-turnstile-response'], ip);
  if (!captcha.ok) return res.status(400).json({ error: 'Please check the "Verify you are human" box and try again.' });

  // ── Layer 5: Rate limit per IP. ──
  const rl = await rateLimit(ip, { prefix: 'nhttrrl', max: MAX_PER_HOUR });
  if (!rl.allowed) return res.status(429).json({ error: 'Too many submissions from this network. Please call us instead.' });

  // Strip meta fields (never trust recipients etc. from the browser) and cap sizes.
  const fields = {};
  for (const [k, v] of Object.entries(body)) {
    if (k.startsWith('_') || k === 'elapsed_ms' || k === 'cf-turnstile-response') continue;
    fields[k] = typeof v === 'string' ? v.slice(0, MAX_FIELD_LEN) : v;
  }

  const lead = {
    full_name:    pick(fields, 'Full Name', 'name', 'full_name'),
    email:        pick(fields, 'Email Address', 'email'),
    phone:        pick(fields, 'Phone Number', 'phone'),
    vehicle_type: pick(fields, 'Vehicle Type', 'vehicle_type'),
    message:      pick(fields, 'Message', 'message'),
    sms_consent:  pick(fields, 'SMS Consent', 'sms_consent'),
    page_url:     pick(fields, 'page_url')
  };

  // ── Layer 6: Email must look real (fake 200 on failure). ──
  if (lead.email) {
    const v = validateEmail(lead.email);
    if (!v.ok) return drop('email_' + v.reason);
  }

  // ── Layer 7: Content heuristics — save as spam, don't email. ──
  const spam = spamReason(lead, Object.values(fields).map(String).join(' '));

  // Store FIRST (fails soft) so the lead is captured even if email fails.
  await insertRow('nhttr_leads', {
    site,
    ...lead,
    recipient: TO,
    status: spam ? 'spam' : 'new',
    payload: spam ? { ...fields, spam_reason: spam, ip } : fields
  });

  if (spam) {
    console.log('notify: flagged as spam (saved, not emailed) —', spam, '| site:', site);
    return res.status(200).json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Email service not configured.' });
  const from = process.env.RESEND_FROM || `${cfg.name} <onboarding@resend.dev>`;

  const html = renderEmail(cfg.name, cfg.subject, [
    ['Full Name', lead.full_name],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Vehicle Type', lead.vehicle_type],
    ['Message', lead.message],
    ['SMS Consent', lead.sms_consent],
    ['Page', lead.page_url],
    ['Website', site]
  ]);

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [TO],
        cc: CC,
        reply_to: lead.email || undefined,
        subject: cfg.subject,
        html
      })
    });
    if (!r.ok) {
      console.error('Resend error:', r.status, await r.text());
      return res.status(502).json({ error: 'Email delivery failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Notify exception:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
