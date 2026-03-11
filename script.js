/**
 * NATIONWIDE HAUL - RV & BUS REPAIR
 * Main JavaScript File
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initHeader();
    initMobileNav();
    initMobileAccordion();
    initSmoothScroll();
    initScrollAnimations();
    initServicesCarousel();
    initPhotoSlider();
});

/**
 * Header scroll effects
 */
function initHeader() {
    const header = document.getElementById('mainHeader');
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateHeader() {
        const scrollY = window.scrollY;

        // Add shadow on scroll
        if (scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScrollY = scrollY;
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    });
}

/**
 * Mobile navigation toggle
 */
function initMobileNav() {
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileNav = document.getElementById('mobileNav');
    const body = document.body;

    if (!mobileToggle || !mobileNav) return;

    mobileToggle.addEventListener('click', function() {
        const isOpen = mobileToggle.classList.contains('active');

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    function openMenu() {
        mobileToggle.classList.add('active');
        mobileNav.classList.add('active');
        body.style.overflow = 'hidden';
        mobileToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        mobileToggle.classList.remove('active');
        mobileNav.classList.remove('active');
        body.style.overflow = '';
        mobileToggle.setAttribute('aria-expanded', 'false');
    }

    // Close menu when clicking on a link
    const mobileLinks = mobileNav.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileToggle.classList.contains('active')) {
            closeMenu();
        }
    });

    // Close menu on window resize (above mobile breakpoint)
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024 && mobileToggle.classList.contains('active')) {
            closeMenu();
        }
    });
}

/**
 * Mobile accordion navigation
 */
function initMobileAccordion() {
    const accordionTriggers = document.querySelectorAll('.accordion-trigger');

    accordionTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const isOpen = this.classList.contains('active');

            // Close all other accordions
            accordionTriggers.forEach(otherTrigger => {
                if (otherTrigger !== this) {
                    otherTrigger.classList.remove('active');
                    otherTrigger.nextElementSibling.classList.remove('active');
                }
            });

            // Toggle current accordion
            if (isOpen) {
                this.classList.remove('active');
                content.classList.remove('active');
            } else {
                this.classList.add('active');
                content.classList.add('active');
            }
        });
    });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip if it's just "#"
            if (href === '#') {
                e.preventDefault();
                return;
            }

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();

                const headerHeight = document.getElementById('mainHeader').offsetHeight;
                const topBarHeight = document.querySelector('.top-bar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = targetPosition - headerHeight - topBarHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Scroll-triggered animations
 */
function initScrollAnimations() {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) return;

    const animatedElements = document.querySelectorAll('.google-review-card, .differentiator-card, .dieselmatic-grid');

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Set initial styles and observe
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
        observer.observe(el);
    });
}

/**
 * Services Carousel - Pixel-based for perfect alignment
 */
function initServicesCarousel() {
    const carousel = document.getElementById('servicesCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    if (!carousel || !dotsContainer) return;

    const track = carousel.querySelector('.services-carousel-track');
    const slides = Array.from(track.querySelectorAll('.service-card-carousel'));
    const prevBtn = carousel.parentElement.querySelector('.carousel-arrow-left');
    const nextBtn = carousel.parentElement.querySelector('.carousel-arrow-right');
    const totalSlides = slides.length;
    const GAP = 16; // must match CSS gap

    let currentIndex = 0;
    let isDragging = false;
    let startX = 0;

    function getSlidesPerView() {
        if (window.innerWidth >= 1024) return 3;
        if (window.innerWidth >= 768) return 2;
        return 1;
    }

    function getMaxIndex() {
        return Math.max(0, totalSlides - getSlidesPerView());
    }

    // Set card widths based on container
    function setSlideWidths() {
        var perView = getSlidesPerView();
        var containerWidth = carousel.offsetWidth;
        var totalGap = GAP * (perView - 1);
        var slideWidth = (containerWidth - totalGap) / perView;
        slides.forEach(function(slide) {
            slide.style.width = slideWidth + 'px';
            slide.style.minWidth = slideWidth + 'px';
        });
    }

    // Build dots
    function buildDots() {
        dotsContainer.innerHTML = '';
        var maxIdx = getMaxIndex();
        for (var i = 0; i <= maxIdx; i++) {
            var dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            if (i === currentIndex) dot.classList.add('active');
            (function(idx) {
                dot.addEventListener('click', function() {
                    goToSlide(idx);
                });
            })(i);
            dotsContainer.appendChild(dot);
        }
    }

    function updateDots() {
        var dots = dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach(function(dot, idx) {
            dot.classList.toggle('active', idx === currentIndex);
        });
    }

    function goToSlide(index) {
        var maxIdx = getMaxIndex();
        currentIndex = Math.max(0, Math.min(index, maxIdx));

        // Calculate pixel offset
        var perView = getSlidesPerView();
        var containerWidth = carousel.offsetWidth;
        var totalGap = GAP * (perView - 1);
        var slideWidth = (containerWidth - totalGap) / perView;
        var offset = currentIndex * (slideWidth + GAP);

        track.style.transform = 'translateX(-' + offset + 'px)';
        updateDots();
    }

    // Arrow navigation
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            goToSlide(currentIndex - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            goToSlide(currentIndex + 1);
        });
    }

    // Touch/drag support
    track.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX;
    }, { passive: true });

    track.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
    }, { passive: true });

    track.addEventListener('touchend', function(e) {
        if (!isDragging) return;
        isDragging = false;
        var endX = e.changedTouches[0].clientX;
        var diff = startX - endX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                goToSlide(currentIndex + 1);
            } else {
                goToSlide(currentIndex - 1);
            }
        }
    });

    // Keyboard navigation
    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            goToSlide(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            goToSlide(currentIndex + 1);
        }
    });

    // Handle resize - recalculate everything
    var resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            setSlideWidths();
            buildDots();
            goToSlide(Math.min(currentIndex, getMaxIndex()));
        }, 100);
    });

    // Initialize
    setSlideWidths();
    buildDots();
    goToSlide(0);
}

/**
 * Photo Slider - Auto-advancing with arrow navigation
 */
function initPhotoSlider() {
    const slider = document.getElementById('photoSlider');
    const dotsContainer = document.getElementById('photoSliderDots');
    if (!slider || !dotsContainer) return;

    const slides = Array.from(slider.querySelectorAll('.photo-slide'));
    const prevBtn = slider.querySelector('.photo-slider-prev');
    const nextBtn = slider.querySelector('.photo-slider-next');
    const totalSlides = slides.length;
    let currentIndex = 0;
    let autoPlayInterval = null;
    let isDragging = false;
    let startX = 0;

    // Build dots
    function buildDots() {
        dotsContainer.innerHTML = '';
        for (var i = 0; i < totalSlides; i++) {
            var dot = document.createElement('button');
            dot.classList.add('photo-slider-dot');
            dot.setAttribute('aria-label', 'Go to photo ' + (i + 1));
            if (i === currentIndex) dot.classList.add('active');
            (function(idx) {
                dot.addEventListener('click', function() {
                    goToSlide(idx);
                    resetAutoPlay();
                });
            })(i);
            dotsContainer.appendChild(dot);
        }
    }

    function updateDots() {
        var dots = dotsContainer.querySelectorAll('.photo-slider-dot');
        dots.forEach(function(dot, idx) {
            dot.classList.toggle('active', idx === currentIndex);
        });
    }

    function goToSlide(index) {
        slides[currentIndex].classList.remove('active');
        currentIndex = ((index % totalSlides) + totalSlides) % totalSlides;
        slides[currentIndex].classList.add('active');
        updateDots();
    }

    // Arrow navigation
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            goToSlide(currentIndex - 1);
            resetAutoPlay();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            goToSlide(currentIndex + 1);
            resetAutoPlay();
        });
    }

    // Touch/swipe support
    slider.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX;
    }, { passive: true });

    slider.addEventListener('touchend', function(e) {
        if (!isDragging) return;
        isDragging = false;
        var endX = e.changedTouches[0].clientX;
        var diff = startX - endX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                goToSlide(currentIndex + 1);
            } else {
                goToSlide(currentIndex - 1);
            }
            resetAutoPlay();
        }
    });

    // Auto-play every 4 seconds
    function startAutoPlay() {
        autoPlayInterval = setInterval(function() {
            goToSlide(currentIndex + 1);
        }, 4000);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    // Pause on hover
    slider.addEventListener('mouseenter', function() {
        clearInterval(autoPlayInterval);
    });
    slider.addEventListener('mouseleave', function() {
        startAutoPlay();
    });

    // Initialize
    buildDots();
    startAutoPlay();
}

/**
 * AJAX Form Submission for FormSubmit.co
 */
(function() {
    document.addEventListener('submit', function(e) {
        var form = e.target.closest('form.contact-form');
        if (!form) return;
        e.preventDefault();

        var btn = form.querySelector('.contact-form-submit');
        var originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Sending...';
        }

        // Remove any existing messages
        var old = form.querySelector('.form-msg');
        if (old) old.remove();

        var data = new FormData(form);
        data.delete('_captcha'); // Captcha incompatible with AJAX

        // FormSubmit.co requires /ajax/ endpoint for JSON responses
        var ajaxUrl = form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');

        fetch(ajaxUrl, {
            method: 'POST',
            body: data,
            headers: { 'Accept': 'application/json' }
        })
        .then(function(res) {
            if (!res.ok) throw new Error('Server error');
            return res.json();
        })
        .then(function() {
            form.reset();
            showMsg(form, 'success', 'Thank you! Your message has been sent. We\'ll get back to you shortly.');
            // Auto-close modal if form is inside one
            var modal = form.closest('.modal');
            if (modal) {
                setTimeout(function() {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }, 3000);
            }
        })
        .catch(function() {
            showMsg(form, 'error', 'Something went wrong. Please call us at <a href="tel:8637744570">(863) 774-4570</a> instead.');
        })
        .finally(function() {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    });

    function showMsg(form, type, html) {
        var div = document.createElement('div');
        div.className = 'form-msg form-msg-' + type;
        div.innerHTML = html;
        form.appendChild(div);
    }
})();

/**
 * Phone number formatting helper
 */

/**
 * Phone number formatting helper
 */
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');

    if (value.length >= 10) {
        value = value.substring(0, 10);
        value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    } else if (value.length >= 6) {
        value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    } else if (value.length >= 3) {
        value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
    }

    input.value = value;
}

/**
 * Lazy loading for images
 */
function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    } else {
        const images = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

/**
 * Analytics tracking helper
 */
function trackEvent(category, action, label) {
    console.log('Track Event:', { category, action, label });

    // Example: Google Analytics 4
    // gtag('event', action, {
    //     'event_category': category,
    //     'event_label': label
    // });
}

// Track CTA clicks
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function() {
        const buttonText = this.textContent.trim();
        trackEvent('CTA', 'Click', buttonText);
    });
});

// Track phone number clicks
document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', function() {
        trackEvent('Contact', 'Phone Click', this.getAttribute('href'));
    });
});

/**
 * Contact Modal
 */
(function() {
    var modal = document.getElementById('contactModal');
    if (!modal) return;

    // Open modal on any schedule service link click
    document.addEventListener('click', function(e) {
        var link = e.target.closest('[data-open-modal="contact"]');
        if (link) {
            e.preventDefault();
            openModal();
        }
    });

    // Close modal on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal on close button
    var closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    function openModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Auto-popup after 10 seconds, once per visit
    if (!sessionStorage.getItem('modalShown')) {
        setTimeout(function() {
            if (!modal.classList.contains('active')) {
                openModal();
                sessionStorage.setItem('modalShown', 'true');
            }
        }, 10000);
    }
})();
