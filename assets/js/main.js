/* ============================================================
   SPEC9 Flooring — Theme Toggle
   ------------------------------------------------------------
   Powers the dark/light switcher in the header.

   How it works:
     1. A tiny inline script in <head> already set
        data-theme="light|dark" on <html> before first paint.
     2. This file finishes the job:
        - keeps the toggle button in sync (icon, aria state)
        - persists the visitor's choice to localStorage
        - falls back to the OS preference when nothing is saved

   Storage key: "spec9-theme"  (values: "light" | "dark")
   When porting to WordPress/ACF this can be swapped for a
   cookie so the choice can also survive authenticated logins.
   ============================================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 'spec9-theme';
    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');

    /* Current theme from the <html> data-theme attribute. */
    function currentTheme() {
        return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    /* Detect the operating system dark-mode preference. */
    function osPreference() {
        try {
            return window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } catch (e) {
            return 'light';
        }
    }

    /* Apply a theme; persist only on explicit user actions so we
       keep the "auto / follow OS" behaviour until they choose. */
    function applyTheme(theme, persist) {
        root.setAttribute('data-theme', theme);
        if (persist) {
            try {
                localStorage.setItem(STORAGE_KEY, theme);
            } catch (e) { /* private browsing / storage blocked */ }
        }
        sync(theme);
    }

    /* Keep the toggle button matching the active theme. */
    function sync(theme) {
        var isDark = theme === 'dark';
        if (btn) {
            btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        }
    }

    /* On load: honour a saved choice, otherwise follow the OS. */
    function init() {
        var saved = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch (e) { /* ignore */ }
        if (saved === 'light' || saved === 'dark') {
            applyTheme(saved, false);
        } else {
            applyTheme(osPreference(), false);
        }
    }

    if (btn) {
        btn.addEventListener('click', function () {
            applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
        });
    }

    init();
})();

/* ============================================================
   Contact / Quote modal
   ------------------------------------------------------------
   Every element with  data-modal-open="quote"  opens the dialog
   (#quote-modal). Accessible: ESC / overlay click / ✕ close it,
   focus is trapped while open, and focus returns to the trigger.

   FORM SUBMISSION (static fallback):
   - Validates required fields (native browser validation).
   - On success shows the "Thank you" panel and pre-fills a
     mailto: link with the submitted details.
   WORDPSESS TODO: replace the submit handler below with a call
   to your form plugin (Contact Form 7 / Gravity Forms) or the
   WP REST API. The modal markup stays exactly the same.
   ============================================================ */
(function () {
    'use strict';

    var backdrop = document.getElementById('quote-modal');
    var form = document.getElementById('quote-form');
    var done = document.getElementById('quote-done');
    var lastTrigger = null;

    if (!backdrop) { return; }

    /* ---------- open / close ---------- */
    function openModal(trigger) {
        lastTrigger = trigger || null;
        backdrop.classList.add('open');
        backdrop.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        /* fresh state on every open (in case of a previous submit) */
        if (form) { form.style.display = ''; }
        if (done) { done.classList.remove('open'); }
        var first = backdrop.querySelector('input, select, textarea');
        if (first) { first.focus(); }
    }

    function closeModal() {
        backdrop.classList.remove('open');
        backdrop.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        if (lastTrigger && typeof lastTrigger.focus === 'function') {
            lastTrigger.focus();
        }
    }

    /* ---------- triggers ---------- */
    Array.prototype.forEach.call(
        document.querySelectorAll('[data-modal-open="quote"]'),
        function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(el);
            });
        }
    );

    /* close: ✕ button, overlay click, Escape */
    Array.prototype.forEach.call(
        backdrop.querySelectorAll('[data-modal-close]'),
        function (el) { el.addEventListener('click', closeModal); }
    );

    backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) { closeModal(); }
    });

    document.addEventListener('keydown', function (e) {
        if (!backdrop.classList.contains('open')) { return; }
        if (e.key === 'Escape') { closeModal(); return; }
        if (e.key === 'Tab') { trapFocus(e); }
    });

    /* keep Tab/Tab+Shift inside the dialog */
    function trapFocus(e) {
        var nodes = backdrop.querySelectorAll(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        var focusables = Array.prototype.filter.call(nodes, function (el) {
            return !el.disabled && el.getAttribute('tabindex') !== '-1';
        });
        if (!focusables.length) { return; }
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    /* ---------- form handling ---------- */
    if (!form) { return; }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();  /* native bubbles on the invalid fields */
            return;
        }

        var gotcha = form.querySelector('[name="_gotcha"]');
        var isBot = gotcha && gotcha.value.trim() !== '';

        if (isBot) {
            showDone();  /* pretend success, drop the submission */
            return;
        }

        /* WP TODO: send `new FormData(form)` to your endpoint here */

        updateMailtoLink();
        showDone();
    });

    function field(id) {
        return document.getElementById(id);
    }

    function valueOf(id) {
        var el = field(id);
        return el ? el.value.trim() : '';
    }

    /* Pre-fill the "Open in email app" link with the details. */
    function updateMailtoLink() {
        var link = document.getElementById('quote-mailto');
        if (!link) { return; }
        var lines = [];
        var name = valueOf('qf-name');
        var email = valueOf('qf-email');
        var phone = valueOf('qf-phone');
        var company = valueOf('qf-company');
        var service = valueOf('qf-service');
        var message = valueOf('qf-message');

        if (name) { lines.push('Name: ' + name); }
        if (company) { lines.push('Company: ' + company); }
        if (email) { lines.push('Email: ' + email); }
        if (phone) { lines.push('Phone: ' + phone); }
        if (service) { lines.push('Needed: ' + service); }
        if (message) { lines.push('\n' + message); }

        link.href = 'mailto:info@spec9.com'
            + '?subject=' + encodeURIComponent('Quote request — ' + (name || 'new enquiry'))
            + '&body=' + encodeURIComponent(lines.join('\n'));
    }

    function showDone() {
        if (form) { form.style.display = 'none'; }
        if (done) { done.classList.add('open'); }
    }
})();