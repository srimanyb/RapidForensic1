/* =====================================================================
   auth.js — Login page controller
   RapidForensics v2 — Backend-connected
   ===================================================================== */

const API_BASE = 'http://localhost:5000';

// ─── Page init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Pre-fill remembered username
    const saved = localStorage.getItem('rf_remembered_username');
    if (saved) {
        const uInput = document.getElementById('username');
        const remCb = document.getElementById('rememberMe');
        if (uInput) uInput.value = saved;
        if (remCb) remCb.checked = true;
    }

    // Redirect already-logged-in users straight to app
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'app.html';
    }
});

// ─── Form submit ──────────────────────────────────────────────────────────────
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    const remember = document.getElementById('rememberMe')?.checked;

    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }

    setLoading(true);
    clearError();

    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            showError(data.message || 'Invalid username or password.');
            setLoading(false);
            return;
        }

        // Persist session
        localStorage.setItem('rf_token', data.token);
        localStorage.setItem('rf_username', data.user.username);
        localStorage.setItem('username', data.user.username); // legacy key used by workflow.js
        localStorage.setItem('isLoggedIn', 'true');

        if (remember) {
            localStorage.setItem('rf_remembered_username', username);
        } else {
            localStorage.removeItem('rf_remembered_username');
        }

        // Redirect to dashboard
        window.location.href = 'app.html';

    } catch (err) {
        showError('Cannot reach the server. Make sure the backend is running on port 5000.');
        console.error('[Login error]', err);
        setLoading(false);
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setLoading(on) {
    const btn = document.getElementById('loginBtn') || document.querySelector('button[type="submit"]');
    const spin = document.getElementById('loginSpinner');
    const txt = document.getElementById('loginBtnText');
    if (btn) btn.disabled = on;
    if (spin) spin.style.display = on ? '' : 'none';
    if (txt) txt.textContent = on ? 'Signing in…' : 'Sign In';
}

function showError(msg) {
    const el = document.getElementById('loginError') || document.getElementById('errorMessage');
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.style.display = '';
}

function clearError() {
    const el = document.getElementById('loginError') || document.getElementById('errorMessage');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}
