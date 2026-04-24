/* ================================================
   Animated State Icons — Vanilla JS
   Ported from 21st.dev / YadHakim design
   ================================================

   Usage:
     StateIcons.init()          → auto-init all .state-icon elements
     StateIcons.toggle(el)      → manually toggle a specific icon
     StateIcons.autoLoop(el, ms) → auto-loop an icon every N ms

   HTML example:
     <div class="state-icon" data-icon="spinner">...</div>
================================================ */

const StateIcons = (() => {

    // ── Spring easing constant ──
    const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

    // ── Toggle an icon element's active state ──
    function toggle(el) {
        if (!el) return;
        el.classList.toggle('active');
        el.dispatchEvent(new CustomEvent('si:change', {
            detail: { active: el.classList.contains('active') },
            bubbles: true
        }));

        // Special: toggle-switch thumb cx update
        if (el.dataset.icon === 'toggle') {
            const thumb = el.querySelector('.thumb');
            if (thumb) {
                const isActive = el.classList.contains('active');
                thumb.setAttribute('cx', isActive ? '15' : '7');
            }
        }
    }

    // ── Auto-loop: toggle every `ms` milliseconds ──
    function autoLoop(el, ms = 2000) {
        if (!el) return;
        toggle(el); // first toggle immediately
        return setInterval(() => toggle(el), ms);
    }

    // ── Build SVG for each icon type ──
    const svgBuilders = {

        spinner: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle class="track" cx="11" cy="11" r="8"/>
                <path class="spin-arc" d="M11 3 a8 8 0 0 1 8 8"/>
                <polyline class="check" points="5,11 9,15 17,7"/>
            </svg>`,

        menu: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line class="l1" x1="3" y1="7" x2="19" y2="7"/>
                <line class="l2" x1="3" y1="11" x2="19" y2="11"/>
                <line class="l3" x1="3" y1="15" x2="19" y2="15"/>
            </svg>`,

        play: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon class="play-shape" points="5,3 19,11 5,19"/>
                <rect class="pause-bar1" x="4" y="3" width="5" height="16" rx="1.5"/>
                <rect class="pause-bar2" x="13" y="3" width="5" height="16" rx="1.5"/>
            </svg>`,

        lock: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="shackle" d="M7 10V7a4 4 0 0 1 8 0v3"/>
                <rect class="body" x="3" y="10" width="16" height="11" rx="2.5"/>
            </svg>`,

        copy: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect class="copy-back" x="8" y="8" width="11" height="11" rx="2"/>
                <path class="copy-front" d="M5 14H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>
                <polyline class="copied-check" points="5,11 9,15 17,7"/>
            </svg>`,

        bell: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="bell-body" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path class="bell-body" d="M13.73 21a2 2 0 0 1-3.46 0" stroke-linecap="round"/>
                <circle class="dot" cx="17" cy="5" r="3"/>
            </svg>`,

        heart: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="heart" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L11 6.67l-2.06-2.06a5.5 5.5 0 0 0-7.78 7.78l2.06 2.06L11 21.23l7.78-7.78 2.06-2.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>`,

        download: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="arrow" d="M11 3v12M6 13l5 5 5-5"/>
                <path class="arrow" d="M3 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
                <polyline class="dl-check" points="5,11 9,15 17,7"/>
            </svg>`,

        send: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon class="plane" points="22,2 15,22 11,13 2,9"/>
                <line class="plane" x1="22" y1="2" x2="11" y2="13"/>
            </svg>`,

        eye: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g class="eye-open">
                    <path d="M1 11s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/>
                    <circle cx="11" cy="11" r="3"/>
                </g>
                <g class="eye-closed">
                    <path d="M17.94 14.94A10.07 10.07 0 0 1 11 17c-7 0-11-6-11-6a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 11 4c7 0 11 6 11 6a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="21" y2="21"/>
                </g>
            </svg>`,

        volume: () => `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon class="vol-shape" points="11,5 6,9 2,9 2,13 6,13 11,17"/>
                <path class="wave1" d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path class="wave2" d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                <line class="mute-x" x1="14" y1="8" x2="20" y2="14"/>
                <line class="mute-x" x1="20" y1="8" x2="14" y2="14"/>
            </svg>`,

        toggle: () => `
            <svg viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect class="track" x="1" y="1" width="20" height="12" rx="6"/>
                <circle class="thumb" cy="7" cx="7" r="4.5"/>
            </svg>`,
    };

    // ── Inject SVG + si-{icon} class into a .state-icon element ──
    function buildIcon(el) {
        const type = el.dataset.icon;
        if (!type || !svgBuilders[type]) return;
        if (!el.querySelector('svg')) {
            el.innerHTML = svgBuilders[type]();
        }
        // Add type-specific class to the SVG
        const svg = el.querySelector('svg');
        if (svg) svg.classList.add('si-' + type);
    }

    // ── Click handler ──
    function attachClick(el) {
        el.addEventListener('click', () => toggle(el));
    }

    // ── Init all icons on page ──
    function init(root = document) {
        root.querySelectorAll('.state-icon[data-icon]').forEach(el => {
            buildIcon(el);
            attachClick(el);
        });
    }

    // ── Create a new icon element programmatically ──
    function create(type, options = {}) {
        const el = document.createElement('div');
        el.className = 'state-icon' + (options.size ? ' ' + options.size : '');
        el.dataset.icon = type;
        if (options.active) el.classList.add('active');
        buildIcon(el);
        attachClick(el);
        return el;
    }

    // Public API
    return { init, toggle, autoLoop, create, buildIcon };
})();

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    StateIcons.init();
});
