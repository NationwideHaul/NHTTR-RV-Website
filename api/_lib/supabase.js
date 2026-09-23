// ─────────────────────────────────────────────────────────────
// Zero-dependency Supabase writes via the PostgREST REST API.
// No npm package needed — same fetch-only approach as Resend/Upstash.
//
// Uses the SERVICE-ROLE key, which bypasses Row Level Security. It is
// server-only and must NEVER be exposed to the browser. Set both in
// Vercel → Project Settings → Environment Variables:
//   SUPABASE_URL                e.g. https://xxxxxxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   Settings → API → service_role (secret)
//
// Every function here FAILS SOFT: it logs and returns { ok:false }
// instead of throwing, so a database hiccup can never block an email
// from going out or break a form submission.
// ─────────────────────────────────────────────────────────────

export function supabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Insert (or upsert) a row into a table.
 * @param {string} table   e.g. 'leads'
 * @param {object} row     column → value
 * @param {object} [opts]  { onConflict: 'email' } to upsert on that column
 * @returns {Promise<{ok:boolean, skipped?:boolean, status?:number, detail?:string}>}
 */
export async function insertRow(table, row, opts = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return { ok: false, skipped: true };

  let endpoint = `${base.replace(/\/$/, '')}/rest/v1/${table}`;
  const prefer = ['return=minimal'];
  if (opts.onConflict) {
    endpoint += `?on_conflict=${encodeURIComponent(opts.onConflict)}`;
    prefer.push('resolution=merge-duplicates');
  }

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: prefer.join(',')
      },
      body: JSON.stringify(row)
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error(`Supabase insert failed [${table}]:`, resp.status, detail);
      return { ok: false, status: resp.status, detail };
    }
    return { ok: true };
  } catch (err) {
    console.error(`Supabase insert exception [${table}]:`, err);
    return { ok: false, detail: String((err && err.message) || err) };
  }
}
