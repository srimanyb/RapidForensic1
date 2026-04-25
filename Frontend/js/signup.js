/* =====================================================================
   signup.js — Signup page controller
   RapidForensics v2 — Backend-connected (POST /api/auth/register)
   ===================================================================== */

// Dynamic API Base: use localhost for dev, or current origin for production (Vercel)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : window.location.origin;


document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signupForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const signupBtn = form.querySelector('.login-btn') || form.querySelector('button[type="submit"]');

    // Toggle password visibility
    togglePasswordBtn?.addEventListener('click', function () {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        const newType = isPassword ? 'text' : 'password';
        passwordInput.setAttribute('type', newType);
        confirmPasswordInput.setAttribute('type', newType);
        this.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });

    // Real-time password match check
    confirmPasswordInput?.addEventListener('input', function () {
        this.style.borderColor = (this.value && this.value !== passwordInput.value)
            ? 'var(--error-color, #ef4444)'
            : '';
    });

    // ── Form submit ───────────────────────────────────────────────────────────
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideError(); hideSuccess();

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Client-side validation
        if (!username || username.length < 3) return showError('Username must be at least 3 characters.');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please enter a valid email address.');
        if (!password || password.length < 6) return showError('Password must be at least 6 characters.');
        if (password !== confirmPassword) return showError('Passwords do not match.');

        setLoading(true);

        try {
            console.log('[Auth] Attempting registration to:', `${API_BASE}/api/auth/register`);
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                showError(data.message || 'Registration failed. Please try again.');
                setLoading(false);
                return;
            }

            // Auto-login: store the token returned with registration
            localStorage.setItem('rf_token', data.token);
            localStorage.setItem('rf_username', data.user.username);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('isLoggedIn', 'true');

            showSuccess('Account created! Redirecting to dashboard…');
            setTimeout(() => { window.location.href = 'app.html'; }, 1800);

        } catch (err) {
            const errorMsg = `Connection failed: ${err.message}. Target: ${API_BASE}`;
            showError(errorMsg);
            console.error('[Signup error detail]', err);
            setLoading(false);
        }
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function setLoading(on) {
        if (signupBtn) signupBtn.disabled = on;
        if (signupBtn) signupBtn.classList.toggle('loading', on);
        Array.from(form.elements).forEach(el => {
            if (el.tagName === 'INPUT') el.disabled = on;
        });
    }

    function showError(msg) {
        if (!errorMessage) { alert(msg); return; }
        errorMessage.textContent = msg;
        errorMessage.classList.add('show');
        setTimeout(hideError, 5000);
    }

    function hideError() {
        errorMessage?.classList.remove('show');
    }

    function showSuccess(msg) {
        if (!successMessage) return;
        successMessage.textContent = msg;
        successMessage.classList.add('show');
    }

    function hideSuccess() {
        successMessage?.classList.remove('show');
    }

    // Input focus animations (preserved from original)
    [usernameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        if (!input) return;
        input.addEventListener('focus', () => input.parentElement?.classList.add('focused'));
        input.addEventListener('blur', () => { if (!input.value) input.parentElement?.classList.remove('focused'); });
    });
});
