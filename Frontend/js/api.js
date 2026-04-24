/**
 * RapidForensics — Frontend API Module
 * Central place for all backend API calls.
 * Uses environment variable or defaults to localhost for development
 */

// Determine API base URL based on environment
const API_BASE = (() => {
    // Check if running on Vercel or has explicit backend URL
    if (typeof process !== 'undefined' && process.env.REACT_APP_API_BASE) {
        return process.env.REACT_APP_API_BASE;
    }
    // Try to get from localStorage (set during login/init)
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('rf_api_base');
        if (stored) return stored;
    }
    // Use current domain if on HTTPS (deployed), otherwise localhost for dev
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        // For Vercel: assume backend is at same domain
        return window.location.origin;
    }
    // Default to localhost for development
    return 'http://localhost:5000';
})();

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getToken() {
    return localStorage.getItem('rf_token') || '';
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
    };
}

/**
 * Wrapped fetch — throws a descriptive Error on non-OK responses.
 */
async function apiFetch(path, options = {}) {
    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, options);
    } catch (err) {
        throw new Error(`Network error – make sure the backend is running on port 5000. (${err.message})`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || `Server error ${res.status}`);
    }
    return data;
}

/* ─── Auth ────────────────────────────────────────────────────────────────── */

/**
 * Register a new user account.
 * @param {string} username
 * @param {string} password
 * @param {string} email
 */
export async function register(username, password, email = '') {
    return apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
    });
}

/**
 * Log in. Stores token + username in localStorage on success.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token, user}>}
 */
export async function login(username, password) {
    const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('rf_token', data.token);
    localStorage.setItem('rf_username', data.user.username);
    localStorage.setItem('isLoggedIn', 'true');
    return data;
}

/**
 * Log out — clears local session.
 */
export function logout() {
    localStorage.removeItem('rf_token');
    localStorage.removeItem('rf_username');
    localStorage.removeItem('isLoggedIn');
}

/* ─── Cases ───────────────────────────────────────────────────────────────── */

/** Fetch all cases from backend. */
export async function getCases() {
    const data = await apiFetch('/api/cases', {
        headers: authHeaders(),
    });
    return data.cases;
}

/**
 * Create a new forensic case.
 * @param {{name, type, priority, investigator, description}} caseData
 */
export async function createCase(caseData) {
    const data = await apiFetch('/api/cases', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(caseData),
    });
    return data.case;
}

/** Get a single case by ID (includes full file list). */
export async function getCase(id) {
    const data = await apiFetch(`/api/cases/${id}`, {
        headers: authHeaders(),
    });
    return data.case;
}

/* ─── Files ───────────────────────────────────────────────────────────────── */

/**
 * Upload one or more files to a case.
 * Backend computes SHA-256 server-side.
 * @param {string} caseId
 * @param {File[]} files — native File objects from an <input> or drop event
 * @returns {Promise<Array>} Array of uploaded file records (with sha256, etc.)
 */
export async function uploadFiles(caseId, files) {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    let res;
    try {
        res = await fetch(`${API_BASE}/api/cases/${caseId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            // NOTE: Do NOT set Content-Type here — browser sets multipart boundary automatically
            body: formData,
        });
    } catch (err) {
        throw new Error(`Network error during upload: ${err.message}`);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`);
    return data.files;
}

/**
 * List all files for a case.
 * @param {string} caseId
 */
export async function getCaseFiles(caseId) {
    const data = await apiFetch(`/api/cases/${caseId}/files`, {
        headers: authHeaders(),
    });
    return data.files;
}

/* ─── Health ─────────────────────────────────────────────────────────────── */

/** Check if backend is reachable. Returns true/false. */
export async function checkHealth() {
    try {
        const data = await apiFetch('/api/health');
        return data.status === 'ok';
    } catch {
        return false;
    }
}
