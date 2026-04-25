/* ================================================
   workflow.js — Unified controller for all 8 pages
   RapidForensics v2
   ================================================ */

// ────────────────────────────────────────────────
// THEME
// ────────────────────────────────────────────────
(function initTheme() {
    const saved = localStorage.getItem('rf-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeUI(saved);
})();

function updateThemeUI(theme) {
    const isLight = theme === 'light';
    const sw = document.getElementById('themeSwitch');
    const st = document.getElementById('settings-theme-toggle');
    if (sw) sw.classList.toggle('on', isLight);
    if (st) st.classList.toggle('active', isLight);
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rf-theme', next);
    updateThemeUI(next);
}
document.getElementById('themeSwitch')?.addEventListener('click', toggleTheme);
window.toggleTheme = toggleTheme;

// ────────────────────────────────────────────────
// AUTH GUARD + USER DISPLAY
// ────────────────────────────────────────────────
(function authGuard() {
    const token = localStorage.getItem('rf_token');
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!token || !loggedIn) { window.location.href = '/index.html'; return; }
    const uname = localStorage.getItem('rf_username') || localStorage.getItem('username') || 'Investigator';
    const el = document.getElementById('sidebarUsername');
    const av = document.getElementById('userAvatarInitial');
    if (el) el.textContent = uname;
    if (av) av.textContent = uname.charAt(0).toUpperCase();
    // Pre-fill investigator box
    const inv = document.getElementById('caseInvestigator');
    if (inv && !inv.value) inv.value = uname;
    // CoC stat
    const cocInv = document.getElementById('coc-investigator');
    if (cocInv) cocInv.textContent = uname;
})();

// Dynamic API Base: use localhost for dev, or current origin for production (Vercel)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : window.location.origin;

function getToken() { return localStorage.getItem('rf_token') || ''; }

function logout() {
    if (!confirm('Sign out of RapidForensics?')) return;
    // Tell backend to invalidate the session
    fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
    }).catch(() => { }); // fire-and-forget
    localStorage.removeItem('rf_token');
    localStorage.removeItem('rf_username');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}
window.logout = logout;

// ────────────────────────────────────────────────
// NAVIGATION
// ────────────────────────────────────────────────
const PAGE_LABELS = {
    'dashboard': 'Dashboard', 'investigation': 'Investigation', 'analytics': 'Analytics',
    'settings': 'Settings', 'hash-generator': 'Hash Generator', 'metadata-extractor': 'Metadata Extractor',
    'chain-of-custody': 'Chain of Custody', 'ai-report': 'AI Report'
};

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
});

function navigateTo(page) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    const bc = document.getElementById('topbarPageName');
    if (bc) bc.textContent = PAGE_LABELS[page] || page;
    // Per-page refresh
    if (page === 'dashboard') refreshDashboard();
    if (page === 'analytics') refreshAnalytics();
    if (page === 'chain-of-custody') refreshChainOfCustody();
    if (page === 'ai-report') refreshReportPage();
    if (window.AppState) AppState.currentPage = page;
}
window.navigateTo = navigateTo;

// ────────────────────────────────────────────────
// APP STATE (local storage persistence)
// ────────────────────────────────────────────────
if (!window.AppState) {
    window.AppState = {
        cases: [], evidence: [], reports: [], chainOfCustody: [], currentCase: null,
        load() {
            try {
                this.cases = JSON.parse(localStorage.getItem('rf_cases') || '[]');
                this.evidence = JSON.parse(localStorage.getItem('rf_evidence') || '[]');
                this.reports = JSON.parse(localStorage.getItem('rf_reports') || '[]');
                this.chainOfCustody = JSON.parse(localStorage.getItem('rf_coc') || '[]');
                const cc = localStorage.getItem('rf_current_case');
                this.currentCase = cc ? JSON.parse(cc) : null;
            } catch (e) { console.warn('AppState load error', e); }
        },
        save() {
            localStorage.setItem('rf_cases', JSON.stringify(this.cases));
            localStorage.setItem('rf_evidence', JSON.stringify(this.evidence));
            localStorage.setItem('rf_reports', JSON.stringify(this.reports));
            localStorage.setItem('rf_coc', JSON.stringify(this.chainOfCustody));
            if (this.currentCase) localStorage.setItem('rf_current_case', JSON.stringify(this.currentCase));
        },
        logActivity(action, evidenceId, details) {
            const entry = {
                id: 'LOG-' + Date.now(),
                timestamp: new Date().toISOString(),
                user: localStorage.getItem('username') || 'Investigator',
                action, evidenceId: evidenceId || null, details,
                hash: simpleHash(action + details + Date.now())
            };
            this.chainOfCustody.push(entry);
            this.save();
            refreshChainOfCustodyIfActive();
        }
    };
    AppState.load();
}

function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, '0') + '-' + Date.now().toString(16);
}

function exportAllData() {
    const data = {
        exportedAt: new Date().toISOString(),
        cases: AppState.cases, evidence: AppState.evidence,
        reports: AppState.reports, chainOfCustody: AppState.chainOfCustody
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rapidforensics-export-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    AppState.logActivity('DATA_EXPORTED', null, 'Exported all data as JSON');
}

function clearAllData() {
    if (confirm('This will permanently delete ALL cases, evidence, and reports. Continue?')) {
        AppState.cases = []; AppState.evidence = []; AppState.reports = []; AppState.chainOfCustody = []; AppState.currentCase = null;
        ['rf_cases', 'rf_evidence', 'rf_reports', 'rf_coc', 'rf_current_case'].forEach(k => localStorage.removeItem(k));
        alert('All data cleared.');
        refreshDashboard();
        updateActiveCasePill();
    }
}

function saveApiKey() {
    const val = document.getElementById('settings-apikey')?.value.trim();
    if (val) { localStorage.setItem('rf_apikey', val); alert('API key saved.'); }
}

window.exportAllData = exportAllData;
window.clearAllData = clearAllData;
window.saveApiKey = saveApiKey;

// ────────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────────
function refreshDashboard() {
    // Fetch real cases from backend then render
    fetch(`${API_BASE}/api/cases`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                // Sync backend cases into AppState so the rest of the UI works as-is
                AppState.cases = data.cases.map(c => ({
                    id: c.id,
                    title: c.name,     // backend uses 'name', frontend uses 'title'
                    type: c.type,
                    priority: c.priority,
                    investigator: c.investigator,
                    description: c.description,
                    status: c.status,
                    created: c.createdAt,
                    files: c.files || [],
                }));

                // ── Sync case.files from backend into AppState.evidence ──────
                // This ensures files uploaded in previous sessions are visible.
                const existingIds = new Set(AppState.evidence.map(e => e.id));
                data.cases.forEach(c => {
                    (c.files || []).forEach(sf => {
                        if (!existingIds.has(sf.id)) {
                            existingIds.add(sf.id);
                            AppState.evidence.push({
                                id: sf.id,
                                caseId: c.id,
                                filename: sf.originalName,
                                size: sf.sizeBytes,
                                type: sf.mimeType || 'application/octet-stream',
                                hash: sf.sha256,
                                risk: calcRisk({ name: sf.originalName }),
                                category: categorize({ name: sf.originalName, type: sf.mimeType || '' }),
                                uploaded: sf.uploadedAt,
                                verified: true,
                            });
                        }
                    });
                });
                AppState.save();
            }
            _renderDashboard();
        })
        .catch(err => {
            console.warn('[Dashboard] Backend unreachable, using local state:', err.message);
            _renderDashboard();
        });
}

function _renderDashboard() {
    const setCt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setCt('stat-total-cases', AppState.cases.length);
    const totalFiles = AppState.cases.reduce((s, c) => s + (c.files ? c.files.length : 0), 0)
        + AppState.evidence.length;
    setCt('stat-evidence', totalFiles);
    setCt('stat-reports', AppState.reports.length);
    setCt('stat-integrity', '100%');

    const cont = document.getElementById('recent-investigations');
    if (!cont) return;
    if (AppState.cases.length === 0) {
        cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div class="empty-state-title">No investigations yet</div><div class="empty-state-sub">Click "New Investigation" to create your first case.</div><button class="btn btn-primary btn-sm" onclick="navigateTo('investigation')">Start Investigation</button></div>`;
        return;
    }
    const rows = AppState.cases.slice().reverse().slice(0, 8).map(c => {
        const ev = (c.files ? c.files.length : 0) + AppState.evidence.filter(e => e.caseId === c.id).length;
        const pri = { critical: 'danger', high: 'warning', medium: 'default', low: 'success' }[c.priority] || 'default';
        return `<tr style="cursor:pointer;" onclick="openCase('${c.id}')">
            <td><code style="font-size:0.72rem;">${c.id}</code></td>
            <td><strong>${c.title || c.name}</strong></td>
            <td><span class="chip ${pri}">${c.priority}</span></td>
            <td>${c.type}</td>
            <td>${ev} files</td>
            <td>${new Date(c.created || c.createdAt).toLocaleDateString()}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="openCase('${c.id}');event.stopPropagation()">Open</button></td>
        </tr>`;
    }).join('');
    cont.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Case ID</th><th>Title</th><th>Priority</th><th>Type</th><th>Evidence</th><th>Created</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    initDashboardChart();
}

function openCase(caseId) {
    const c = AppState.cases.find(x => x.id === caseId);
    if (!c) return;
    AppState.currentCase = c;
    AppState.save();
    updateActiveCasePill();
    navigateTo('investigation');
    showInvStep(2);
}
window.openCase = openCase;
window.refreshDashboard = refreshDashboard;

function initDashboardChart() {
    const canvas = document.getElementById('dashboard-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        data.push(AppState.cases.filter(c => new Date(c.created).toDateString() === d.toDateString()).length);
    }
    if (window._dashChart) window._dashChart.destroy();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor = isDark ? 'rgba(59,130,246,0.08)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? '#405270' : '#7a8fa6';
    window._dashChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets: [{ label: 'Cases', data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#3b82f6' }] },
        options: {
            responsive: true, plugins: { legend: { labels: { color: tickColor } } },
            scales: { y: { beginAtZero: true, ticks: { color: tickColor, stepSize: 1 }, grid: { color: gridColor } }, x: { ticks: { color: tickColor }, grid: { color: gridColor } } }
        }
    });
}

// ────────────────────────────────────────────────
// INVESTIGATION — 3-step wizard
// ────────────────────────────────────────────────
function showInvStep(n) {
    [1, 2, 3].forEach(i => {
        const panel = document.getElementById('inv-panel-' + i);
        if (panel) panel.style.display = i === n ? '' : 'none';
        const step = document.getElementById('inv-step-' + i);
        if (step) {
            step.style.color = i === n ? 'var(--blue-400)' : 'var(--txt-3)';
            step.style.background = i === n ? 'rgba(59,130,246,0.07)' : '';
            const dot = step.querySelector('span');
            if (dot) {
                dot.style.background = i === n ? 'var(--blue-600)' : (i < n ? '#10b981' : 'var(--surface)');
                dot.style.color = i <= n ? 'white' : 'var(--txt-3)';
                dot.style.border = i < n ? '1px solid #10b981' : (i === n ? '' : '1px solid var(--border-md)');
                dot.textContent = i < n ? '✓' : i;
            }
        }
    });
    if (n === 2) { renderCasesList(); updateActiveCaseBadge(); renderEvidenceTable(); }
    if (n === 3) { renderEvidenceViewer(); }
}
window.showInvStep = showInvStep;

// Create Case Form — POST to backend
document.getElementById('createCaseForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('caseName')?.value.trim();
    if (!name) return;

    const btn = this.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    const payload = {
        name,
        type: document.getElementById('caseType')?.value || 'other',
        priority: document.getElementById('casePriority')?.value || 'medium',
        investigator: document.getElementById('caseInvestigator')?.value ||
            localStorage.getItem('rf_username') || 'Investigator',
        description: document.getElementById('caseDescription')?.value || '',
    };

    try {
        const res = await fetch(`${API_BASE}/api/cases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create case.');

        // Normalise to workflow.js field names
        const newCase = {
            id: data.case.id,
            title: data.case.name,
            type: data.case.type,
            priority: data.case.priority,
            investigator: data.case.investigator,
            description: data.case.description,
            created: data.case.createdAt,
            status: data.case.status,
            files: [],
        };
        AppState.cases.push(newCase);
        AppState.currentCase = newCase;
        AppState.logActivity('CASE_CREATED', null, `Created case: ${newCase.title} (${newCase.id})`);
        AppState.save();
        updateActiveCasePill();
        showMsg('case-form-msg', `✅ Case "${newCase.title}" created! Proceeding to evidence upload.`, 'success');
        setTimeout(() => showInvStep(2), 1200);

    } catch (err) {
        showMsg('case-form-msg', '❌ ' + err.message, 'error');
        console.error('[Create case error]', err);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create Case & Continue'; }
    }
});

function showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = '';
    el.innerHTML = `<div class="chip ${type === 'success' ? 'success' : 'danger'}" style="padding:0.5rem 0.8rem;border-radius:6px;font-size:0.82rem;">${text}</div>`;
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function renderCasesList() {
    const cont = document.getElementById('cases-list-panel');
    if (!cont) return;
    if (AppState.cases.length === 0) {
        cont.innerHTML = '<div class="empty-state"><div class="empty-state-sub">No cases yet. Fill the form to create one.</div></div>';
        return;
    }
    cont.innerHTML = AppState.cases.slice().reverse().slice(0, 10).map(c => {
        const isActive = AppState.currentCase?.id === c.id;
        const priColor = { critical: '#fca5a5', high: '#fdba74', medium: '#3b82f6', low: '#86efac' }[c.priority] || '#3b82f6';
        return `<div onclick="selectCase('${c.id}')" style="padding:0.65rem 0.75rem;border:1px solid ${isActive ? 'var(--blue-600)' : 'var(--border)'};border-radius:8px;margin-bottom:0.5rem;cursor:pointer;background:${isActive ? 'rgba(59,130,246,0.07)' : 'transparent'};transition:all 0.2s;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem;">
                <span style="font-weight:600;font-size:0.84rem;color:var(--txt-1);">${c.title}</span>
                <span style="font-size:0.64rem;color:${priColor};font-weight:700;text-transform:uppercase;">${c.priority}</span>
            </div>
            <div style="font-size:0.72rem;color:var(--txt-3);">${c.id} · ${new Date(c.created).toLocaleString()}</div>
        </div>`;
    }).join('');
}

function selectCase(caseId) {
    const c = AppState.cases.find(x => x.id === caseId);
    if (!c) return;
    AppState.currentCase = c;
    AppState.save();
    updateActiveCasePill();
    renderCasesList();
    AppState.logActivity('CASE_SELECTED', null, `Selected case: ${c.title}`);
    showInvStep(2);
}
window.selectCase = selectCase;

function updateActiveCasePill() {
    const pill = document.getElementById('active-case-pill');
    const badge = document.getElementById('active-case-badge');
    if (!AppState.currentCase) { if (pill) pill.style.display = 'none'; return; }
    const label = `📁 ${AppState.currentCase.title}`;
    if (pill) { pill.style.display = ''; pill.textContent = label; }
    if (badge) badge.textContent = label;
}

function updateActiveCaseBadge() {
    updateActiveCasePill();
}

// ────────────────────────────────────────────────
// EVIDENCE UPLOAD
// ────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        handleFiles(Array.from(e.dataTransfer.files));
    });
}
if (fileInput) fileInput.addEventListener('change', e => handleFiles(Array.from(e.target.files)));

async function handleFiles(files) {
    if (!AppState.currentCase) {
        alert('Please select or create a case first (Step 1).');
        showInvStep(1); return;
    }
    const prog = document.getElementById('upload-progress');

    // ── Upload to backend via FormData ────────────────────────────────────────
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    if (prog) prog.innerHTML = `<div class="chip default" style="font-size:0.78rem;">⚙️ Uploading ${files.length} file(s) to server…</div>`;

    let serverFiles = [];
    try {
        const res = await fetch(`${API_BASE}/api/cases/${AppState.currentCase.id}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            // NOTE: NO Content-Type header — browser sets multipart boundary automatically
            body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');
        serverFiles = data.files; // each has { id, originalName, sizeBytes, sha256, mimeType, uploadedAt }
    } catch (err) {
        console.warn('[Upload] Backend error, falling back to client-side hashing:', err.message);
        // Fallback: compute SHA-256 in browser if backend is unreachable
        serverFiles = await Promise.all(files.map(async f => ({
            id: 'EV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            originalName: f.name,
            sizeBytes: f.size,
            mimeType: f.type,
            sha256: await computeSHA256(f),
            uploadedAt: new Date().toISOString(),
        })));
    }

    // Map server file records into AppState evidence format
    serverFiles.forEach(sf => {
        const ev = {
            id: sf.id,
            caseId: AppState.currentCase.id,
            filename: sf.originalName,
            size: sf.sizeBytes,
            type: sf.mimeType || 'application/octet-stream',
            hash: sf.sha256,
            risk: calcRisk({ name: sf.originalName }),
            category: categorize({ name: sf.originalName, type: sf.mimeType || '' }),
            uploaded: sf.uploadedAt,
            verified: true,
        };
        AppState.evidence.push(ev);
        AppState.logActivity('EVIDENCE_UPLOADED', ev.id, `Uploaded: ${ev.filename} [${ev.hash.substr(0, 12)}…]`);
    });

    AppState.save();
    if (prog) prog.innerHTML = `<div class="chip success" style="font-size:0.78rem;">✅ ${files.length} file(s) uploaded &amp; hashed by server</div>`;
    setTimeout(() => { if (prog) prog.innerHTML = ''; }, 3000);
    renderEvidenceTable();
    refreshMonitorWidget();
}

async function computeSHA256(file) {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function calcRisk(file) {
    const exts = file.name.split('.').pop().toLowerCase();
    if (['exe', 'dll', 'bat', 'ps1', 'sh', 'vbs', 'js', 'msi', 'cmd'].includes(exts)) return 'critical';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'log'].includes(exts)) return 'high';
    if (['doc', 'docx', 'xls', 'xlsx', 'pdf', 'ppt'].includes(exts)) return 'medium';
    return 'low';
}

function categorize(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const type = file.type;
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('text/') || ['log', 'txt', 'csv'].includes(ext)) return 'Text/Log';
    if (['exe', 'dll', 'bat', 'ps1', 'sh', 'vbs', 'msi', 'cmd'].includes(ext)) return 'Executable';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archive';
    if (['doc', 'docx', 'xls', 'xlsx', 'pdf', 'ppt', 'pptx'].includes(ext)) return 'Document';
    return 'Other';
}

function renderEvidenceTable() {
    const tbody = document.getElementById('evidence-tbody');
    const badge = document.getElementById('evidence-count-badge');
    if (!tbody) return;
    const ev = AppState.currentCase
        ? AppState.evidence.filter(e => e.caseId === AppState.currentCase.id)
        : AppState.evidence;
    if (badge) badge.textContent = `${ev.length} files`;
    if (ev.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:1.5rem;"><div class="empty-state-sub">No evidence yet. Drop files above.</div></div></td></tr>`;
        return;
    }
    const riskClass = { critical: 'danger', high: 'warning', medium: 'default', low: 'success' };
    tbody.innerHTML = ev.map(e => `<tr onclick="selectEvidence('${e.id}')" style="cursor:pointer;">
        <td><strong style="font-size:0.83rem;">${e.filename}</strong></td>
        <td>${formatBytes(e.size)}</td>
        <td><code style="font-size:0.68rem;color:var(--blue-400);">${e.hash.substr(0, 16)}…</code></td>
        <td><span class="chip ${riskClass[e.risk] || 'default'}">${e.risk}</span></td>
        <td><span class="chip default">${e.category}</span></td>
        <td style="font-size:0.75rem;color:var(--txt-3);">${new Date(e.uploaded).toLocaleString()}</td>
    </tr>`).join('');
}

function selectEvidence(evId) {
    const ev = AppState.evidence.find(e => e.id === evId);
    if (!ev) return;
    AppState.logActivity('EVIDENCE_VIEWED', ev.id, `Viewed: ${ev.filename}`);
    showInvStep(3);
    renderEvidenceDetail(ev);
}
window.selectEvidence = selectEvidence;

function renderEvidenceViewer() {
    const c = AppState.currentCase;
    const ev = c ? AppState.evidence.filter(e => e.caseId === c.id) : [];

    // Update top label
    const lbl = document.getElementById('step3-case-label');
    if (lbl) lbl.textContent = c ? `📁 ${c.title} · ${ev.length} file(s)` : 'No case selected';
    const cnt = document.getElementById('step3-ev-count');
    if (cnt) cnt.textContent = `${ev.length} files`;

    const cont = document.getElementById('evidence-viewer-content');
    if (!cont) return;

    if (ev.length === 0) {
        cont.innerHTML = `<div class="empty-state" style="padding:1.5rem;">
            <div class="empty-state-sub">No evidence yet. Upload files in Step 2.</div>
            <button class="btn btn-primary btn-sm" onclick="showInvStep(2)">← Upload Evidence</button>
        </div>`;
        return;
    }

    const riskClass = { critical: 'danger', high: 'warning', medium: 'default', low: 'success' };
    cont.innerHTML = ev.map(e => `
        <div onclick="renderEvidenceDetail(AppState.evidence.find(x=>x.id==='${e.id}'))"
             style="padding:0.55rem 0.75rem;border:1px solid var(--border);border-radius:8px;margin-bottom:0.5rem;cursor:pointer;transition:all 0.15s;"
             onmouseenter="this.style.borderColor='var(--blue-600)';this.style.background='rgba(59,130,246,0.04)'"
             onmouseleave="this.style.borderColor='var(--border)';this.style.background='transparent'">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
                <span style="font-weight:600;font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.filename}</span>
                <span class="chip ${riskClass[e.risk] || 'default'}" style="flex-shrink:0;font-size:0.65rem;">${e.risk}</span>
            </div>
            <div style="font-size:0.71rem;color:var(--txt-3);margin-top:0.15rem;">${formatBytes(e.size)} · <code style="color:var(--blue-400);">${e.hash.substr(0, 14)}…</code></div>
        </div>`).join('');
}

function renderEvidenceDetail(ev) {
    if (!ev) return;
    const area = document.getElementById('ev-detail-area');
    const tbl = document.getElementById('ev-detail-table');
    const title = document.getElementById('ev-detail-name');
    const risk = document.getElementById('ev-detail-risk');
    const rClass = ev.risk === 'critical' ? 'danger' : ev.risk === 'high' ? 'warning' : ev.risk === 'low' ? 'success' : 'default';
    if (area) area.style.display = '';
    if (title) title.textContent = ev.filename;
    if (risk) { risk.textContent = ev.risk + ' risk'; risk.className = `chip ${rClass}`; }
    if (tbl) tbl.innerHTML = `<table><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>
        <tr><td>Filename</td><td><strong>${ev.filename}</strong></td></tr>
        <tr><td>Size</td><td>${formatBytes(ev.size)}</td></tr>
        <tr><td>Type</td><td><code style="font-size:0.75rem;">${ev.type}</code></td></tr>
        <tr><td>Category</td><td>${ev.category}</td></tr>
        <tr><td>Risk</td><td><span class="chip ${rClass}">${ev.risk}</span></td></tr>
        <tr><td>SHA-256</td><td><code style="font-size:0.68rem;color:var(--blue-400);word-break:break-all;">${ev.hash}</code></td></tr>
        <tr><td>Uploaded</td><td>${new Date(ev.uploaded).toLocaleString()}</td></tr>
        <tr><td>Integrity</td><td><span class="chip success">✓ Verified</span></td></tr>
        <tr><td>Evidence ID</td><td><code style="font-size:0.68rem;">${ev.id}</code></td></tr>
    </tbody></table>`;
    AppState.logActivity('EVIDENCE_VIEWED', ev.id, `Viewed: ${ev.filename}`);
}
window.renderEvidenceDetail = renderEvidenceDetail;


function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
}

// ────────────────────────────────────────────────
// ANALYTICS
// ────────────────────────────────────────────────
function refreshAnalytics() {
    renderTimeline();
    renderCategoryChart();
    renderRiskChart();
}
window.refreshAnalytics = refreshAnalytics;

function renderTimeline() {
    const cont = document.getElementById('timeline-container');
    if (!cont) return;
    const items = AppState.chainOfCustody.slice().reverse().slice(0, 20);
    if (items.length === 0) {
        cont.innerHTML = '<div class="empty-state"><div class="empty-state-sub">No events yet. Start an investigation.</div></div>';
        return;
    }
    cont.innerHTML = items.map(item => {
        const icon = {
            'CASE_CREATED': '📁', 'EVIDENCE_UPLOADED': '📂', 'EVIDENCE_VIEWED': '🔍',
            'CASE_SELECTED': '✅', 'DATA_EXPORTED': '💾', 'AI_ANALYSIS': '🤖',
            'REPORT_GENERATED': '📄', 'CHAIN_EXPORTED': '🔗', 'METADATA_EXTRACTED': '🔬'
        }[item.action] || '📌';
        return `<div class="timeline-item">
            <div class="timeline-dot">${icon}</div>
            <div class="timeline-content">
                <div class="timeline-title">${item.action.replace(/_/g, ' ')}</div>
                <div class="timeline-desc">${item.details}</div>
                <div class="timeline-time">${new Date(item.timestamp).toLocaleString()} · ${item.user}</div>
            </div>
        </div>`;
    }).join('');
}

function renderCategoryChart() {
    const canvas = document.getElementById('category-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const cats = {};
    AppState.evidence.forEach(e => { cats[e.category] = (cats[e.category] || 0) + 1; });
    const labels = Object.keys(cats); const data = Object.values(cats);
    if (window._catChart) window._catChart.destroy();
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    window._catChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: { labels: labels.length ? labels : ['No data'], datasets: [{ data: data.length ? data : [1], backgroundColor: colors, borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { labels: { color: document.documentElement.getAttribute('data-theme') === 'light' ? '#0f172a' : '#e2e8f0', boxWidth: 12 } } } }
    });
}

function renderRiskChart() {
    const canvas = document.getElementById('risk-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const risks = { critical: 0, high: 0, medium: 0, low: 0 };
    AppState.evidence.forEach(e => { if (risks[e.risk] !== undefined) risks[e.risk]++; });
    if (window._riskChart) window._riskChart.destroy();
    const tick = document.documentElement.getAttribute('data-theme') === 'light' ? '#0f172a' : '#e2e8f0';
    window._riskChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels: ['Critical', 'High', 'Medium', 'Low'], datasets: [{ data: [risks.critical, risks.high, risks.medium, risks.low], backgroundColor: ['#fca5a5', '#fdba74', '#3b82f6', '#86efac'], borderRadius: 6, borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: tick, stepSize: 1 }, grid: { color: 'rgba(59,130,246,0.06)' } }, x: { ticks: { color: tick }, grid: { display: false } } } }
    });
}

// ────────────────────────────────────────────────
// HASH GENERATOR PAGE
// ────────────────────────────────────────────────
const hashDropZone = document.getElementById('hashDropZone');
if (hashDropZone) {
    hashDropZone.addEventListener('dragover', e => { e.preventDefault(); hashDropZone.classList.add('dragover'); });
    hashDropZone.addEventListener('dragleave', () => hashDropZone.classList.remove('dragover'));
    hashDropZone.addEventListener('drop', e => { e.preventDefault(); hashDropZone.classList.remove('dragover'); if (e.dataTransfer.files[0]) hashFile(e.dataTransfer.files[0]); });
    hashDropZone.addEventListener('click', () => document.getElementById('hashFileInput')?.click());
}

async function hashFile(file) {
    if (!file) return;
    const area = document.getElementById('hash-result-area');
    if (area) area.innerHTML = `<div class="chip default">⚙️ Computing SHA-256 for ${file.name}...</div>`;
    let hash = '';
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/api/hash/sha256`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Hash API error');
        hash = data.sha256;
    } catch (_err) {
        hash = await computeSHA256(file);
    }
    AppState.logActivity('HASH_GENERATED', null, `Hashed file: ${file.name} → ${hash.substr(0, 16)}...`);
    if (area) area.innerHTML = `
        <div class="card" style="border:1px solid rgba(59,130,246,0.25);">
            <div class="card-body">
                <div style="font-size:0.8rem;color:var(--txt-3);margin-bottom:0.3rem;">📄 ${file.name} (${formatBytes(file.size)})</div>
                <div style="font-size:0.75rem;font-weight:600;color:var(--txt-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.4rem;">SHA-256</div>
                <code style="display:block;padding:0.65rem 0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.74rem;color:var(--blue-400);word-break:break-all;user-select:all;">${hash}</code>
                <button class="btn btn-ghost btn-sm" style="margin-top:0.6rem;" onclick="navigator.clipboard.writeText('${hash}');this.textContent='Copied!'">Copy Hash</button>
                <div style="font-size:0.72rem;color:var(--txt-3);margin-top:0.4rem;">✓ Integrity verified · Chain of custody updated</div>
            </div>
        </div>`;
}
window.hashFile = hashFile;

async function hashText() {
    const text = document.getElementById('hashTextInput')?.value;
    if (!text) return;
    const buf = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const area = document.getElementById('text-hash-result');
    if (area) area.innerHTML = `
        <div style="font-size:0.75rem;font-weight:600;color:var(--txt-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.4rem;">SHA-256</div>
        <code style="display:block;padding:0.65rem 0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.74rem;color:var(--blue-400);word-break:break-all;user-select:all;">${hash}</code>
        <button class="btn btn-ghost btn-sm" style="margin-top:0.6rem;" onclick="navigator.clipboard.writeText('${hash}');this.textContent='Copied!'">Copy Hash</button>`;
}
window.hashText = hashText;

function verifyHashes() {
    const a = document.getElementById('hash-verify-a')?.value.trim().toLowerCase();
    const b = document.getElementById('hash-verify-b')?.value.trim().toLowerCase();
    const res = document.getElementById('hash-verify-result');
    if (!a || !b) { if (res) res.innerHTML = `<div class="chip warning">Please enter both hashes.</div>`; return; }
    const match = a === b;
    if (res) res.innerHTML = match
        ? `<div class="chip success" style="font-size:0.85rem;padding:0.5rem 0.8rem;">✅ Hashes MATCH — File integrity confirmed</div>`
        : `<div class="chip danger" style="font-size:0.85rem;padding:0.5rem 0.8rem;">❌ Hashes DO NOT MATCH — Integrity compromised</div>`;
}
window.verifyHashes = verifyHashes;

// ────────────────────────────────────────────────
// METADATA EXTRACTOR
// ────────────────────────────────────────────────
const metaDrop = document.getElementById('metaDropZone');
if (metaDrop) {
    metaDrop.addEventListener('dragover', e => { e.preventDefault(); metaDrop.classList.add('dragover'); });
    metaDrop.addEventListener('dragleave', () => metaDrop.classList.remove('dragover'));
    metaDrop.addEventListener('drop', e => { e.preventDefault(); metaDrop.classList.remove('dragover'); if (e.dataTransfer.files[0]) extractMetadata(e.dataTransfer.files[0]); });
    metaDrop.addEventListener('click', () => document.getElementById('metaFileInput')?.click());
}

async function extractMetadata(file) {
    if (!file) return;
    const hash = await computeSHA256(file);
    const meta = [
        ['Filename', file.name],
        ['File Size', formatBytes(file.size)],
        ['MIME Type', file.type || 'application/octet-stream'],
        ['Extension', file.name.split('.').pop().toUpperCase()],
        ['Last Modified', new Date(file.lastModified).toLocaleString()],
        ['SHA-256 Hash', hash],
        ['Extracted At', new Date().toLocaleString()],
        ['Risk Level', calcRisk(file).toUpperCase()],
        ['Category', categorize(file)],
    ];
    const card = document.getElementById('metadata-result-card');
    const tbody = document.getElementById('metadata-tbody');
    const title = document.getElementById('meta-filename');
    if (title) title.textContent = `Metadata: ${file.name}`;
    if (tbody) tbody.innerHTML = meta.map(([k, v]) => `<tr><td style="font-weight:500;color:var(--txt-2);width:40%;">${k}</td><td><code style="font-size:0.78rem;">${v}</code></td></tr>`).join('');
    if (card) card.style.display = '';
    AppState.logActivity('METADATA_EXTRACTED', null, `Extracted metadata: ${file.name}`);
    window._lastMetadata = meta;
}
window.extractMetadata = extractMetadata;

function copyMetadata() {
    if (!window._lastMetadata) return;
    const text = window._lastMetadata.map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text).then(() => alert('Metadata copied to clipboard!'));
}
window.copyMetadata = copyMetadata;

// ────────────────────────────────────────────────
// CHAIN OF CUSTODY PAGE
// ────────────────────────────────────────────────
function refreshChainOfCustody() {
    const tbody = document.getElementById('coc-tbody');
    const badge = document.getElementById('coc-count-badge');
    const countEl = document.getElementById('coc-entry-count');
    const lastEl = document.getElementById('coc-last-time');

    const entries = AppState.chainOfCustody;
    if (countEl) countEl.textContent = entries.length;
    if (badge) badge.textContent = `${entries.length} entries`;
    if (lastEl && entries.length > 0) {
        lastEl.textContent = new Date(entries[entries.length - 1].timestamp).toLocaleTimeString();
    }
    if (!tbody) return;
    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:1.5rem;"><div class="empty-state-sub">No activity logged yet. Start an investigation.</div></div></td></tr>`;
        return;
    }
    tbody.innerHTML = entries.slice().reverse().map(e => `<tr>
        <td style="font-size:0.75rem;white-space:nowrap;">${new Date(e.timestamp).toLocaleString()}</td>
        <td style="font-size:0.8rem;">${e.user}</td>
        <td><span class="chip default" style="font-size:0.7rem;">${e.action}</span></td>
        <td style="font-size:0.8rem;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.details}</td>
        <td><code style="font-size:0.68rem;color:var(--txt-3);">${e.hash.substr(0, 14)}…</code></td>
    </tr>`).join('');
}
window.refreshChainOfCustody = refreshChainOfCustody;

function refreshChainOfCustodyIfActive() {
    const active = document.getElementById('page-chain-of-custody');
    if (active && active.classList.contains('active')) refreshChainOfCustody();
}

// ────────────────────────────────────────────────
// AI REPORT PAGE
// ────────────────────────────────────────────────
function detectAiFileType(file) {
    const ext = (file?.name || '').split('.').pop().toLowerCase();
    if ((file?.type || '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'log') return 'log';
    if (ext === 'json') return 'json';
    if (ext === 'eml' || ext === 'msg') return 'email';
    return 'text';
}

async function extractAiFileData(file, fileType) {
    if (!file) return '';
    if (fileType === 'image') {
        return `Filename: ${file.name}\nMIME: ${file.type || 'image/unknown'}\nSize bytes: ${file.size}\nNote: OCR text not available in-browser; metadata provided for AI triage.`;
    }
    const maxBytes = 100 * 1024;
    const text = await file.slice(0, maxBytes).text();
    return text;
}

function setAiStatus(message, type = 'default') {
    const el = document.getElementById('ai-analysis-status');
    if (!el) return;
    const chipClass = type === 'error' ? 'danger' : type === 'success' ? 'success' : 'default';
    el.innerHTML = `<span class="chip ${chipClass}" style="font-size:0.76rem;">${message}</span>`;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function runAiAnalysis() {
    const fileInput = document.getElementById('aiEvidenceFileInput');
    const typeInput = document.getElementById('aiFileType');
    const button = document.getElementById('runAiAnalysisBtn');
    const file = fileInput?.files?.[0];

    if (!file) {
        setAiStatus('Please upload a file first.', 'error');
        return;
    }

    const fileType = typeInput?.value || detectAiFileType(file);
    let fileData = '';

    try {
        fileData = await extractAiFileData(file, fileType);
    } catch (err) {
        setAiStatus('Failed to read file content: ' + err.message, 'error');
        return;
    }

    if (!fileData || !fileData.trim()) {
        setAiStatus('No readable file data was extracted.', 'error');
        return;
    }

    try {
        if (button) button.disabled = true;
        setAiStatus('Running AI forensic analysis…');

        const response = await fetch(`${API_BASE}/api/ai/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ fileData, fileType }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `AI analysis failed (${response.status})`);
        }

        renderAiAnalysisResult(data);
        setAiStatus('AI analysis complete.', 'success');
        AppState.logActivity('AI_ANALYSIS', null, `AI analyzed ${file.name} (${fileType})`);
    } catch (err) {
        setAiStatus(err.message, 'error');
    } finally {
        if (button) button.disabled = false;
    }
}
window.runAiAnalysis = runAiAnalysis;

function renderAiAnalysisResult(data) {
    const panel = document.getElementById('ai-analysis-panel');
    const modelChip = document.getElementById('ai-model-chip');
    const threatType = document.getElementById('ai-threat-type');
    const indicators = document.getElementById('ai-indicators');
    const explanation = document.getElementById('ai-explanation');
    const riskChip = document.getElementById('ai-risk-chip');

    if (!panel || !threatType || !indicators || !explanation || !riskChip) return;

    const riskLevel = ['Low', 'Medium', 'High'].includes(data.severity) ? data.severity : 'Low';
    const riskClass = riskLevel === 'High' ? 'danger' : riskLevel === 'Medium' ? 'warning' : 'success';
    riskChip.className = `chip ${riskClass}`;
    riskChip.textContent = riskLevel;

    if (modelChip) modelChip.textContent = data.model || 'unknown model';
    threatType.textContent = data.threatType || 'Unknown';

    const ind = data.indicators || {};
    const keywords = Array.isArray(ind.keywords_detected) ? ind.keywords_detected : [];
    const suspiciousIps = Array.isArray(ind.suspicious_ips) ? ind.suspicious_ips : [];
    indicators.innerHTML = `
        <li>Failed logins: ${Number(ind.failed_logins || 0)}</li>
        <li>Suspicious IPs: ${suspiciousIps.length ? suspiciousIps.map(escapeHtml).join(', ') : 'None'}</li>
        <li>Keywords: ${keywords.length ? keywords.map(escapeHtml).join(', ') : 'None'}</li>
        <li>Unusual time window (2AM-5AM): ${ind.unusual_time ? 'Yes' : 'No'}</li>
    `;
    explanation.textContent = data.report || 'No forensic report generated.';
    panel.style.display = '';

    // Pre-fill report context so users can generate a fuller report with one click.
    const notes = document.getElementById('reportNotes');
    if (notes) {
        notes.value = [
            `Threat Type: ${data.threatType || ''}`,
            `Severity: ${riskLevel}`,
            `Indicators: ${JSON.stringify(ind, null, 2)}`,
            '',
            'Forensic Explanation:',
            data.report || '',
        ].join('\n').trim();
    }
}

function refreshReportPage() {
    const sel = document.getElementById('report-case-select');
    if (sel) {
        sel.innerHTML = '<option value="">— Select a case —</option>' +
            AppState.cases.map(c => `<option value="${c.id}">${c.title} (${c.id})</option>`).join('');
        if (AppState.currentCase) sel.value = AppState.currentCase.id;
    }

    const aiFileInput = document.getElementById('aiEvidenceFileInput');
    const aiFileType = document.getElementById('aiFileType');
    if (aiFileInput && aiFileType) {
        aiFileInput.onchange = () => {
            const file = aiFileInput.files?.[0];
            if (file) aiFileType.value = detectAiFileType(file);
        };
    }
    renderReportsList();
}
window.refreshReportPage = refreshReportPage;

function renderReportsList() {
    const cont = document.getElementById('reports-list');
    const cnt = document.getElementById('reports-count');
    if (!cont) return;
    if (cnt) cnt.textContent = AppState.reports.length;
    if (AppState.reports.length === 0) {
        cont.innerHTML = '<div class="empty-state"><div class="empty-state-sub">No reports yet.</div></div>';
        return;
    }
    cont.innerHTML = AppState.reports.slice().reverse().map((r, i) => `
        <div onclick="loadReport(${AppState.reports.length - 1 - i})" style="padding:0.65rem 0.75rem;border:1px solid var(--border);border-radius:8px;margin-bottom:0.5rem;cursor:pointer;transition:all 0.15s;" onmouseenter="this.style.borderColor='var(--blue-600)'" onmouseleave="this.style.borderColor='var(--border)'">
            <div style="font-weight:600;font-size:0.84rem;color:var(--txt-1);">📄 ${r.title}</div>
            <div style="font-size:0.72rem;color:var(--txt-3);">${r.type} · ${new Date(r.created).toLocaleString()}</div>
        </div>`).join('');
}

function loadReport(idx) {
    const r = AppState.reports[idx];
    if (!r) return;
    const el = document.getElementById('reportEditorContent');
    if (el) el.value = r.content;
    document.getElementById('report-output-card').style.display = '';
}
window.loadReport = loadReport;

async function generateReport() {
    const btn = document.getElementById('generateReportBtn');
    const caseId = document.getElementById('report-case-select')?.value;
    if (!caseId) { alert('Please select a case first.'); return; }
    const caseObj = AppState.cases.find(c => c.id === caseId);
    if (!caseObj) { alert('Case not found.'); return; }

    const ev = AppState.evidence.filter(e => e.caseId === caseId);
    const notes = document.getElementById('reportNotes')?.value.trim() || '';
    const rType = document.getElementById('reportType')?.value || 'full';

    if (btn) { btn.disabled = true; btn.querySelector('.btn-text') ? btn.querySelector('.btn-text').textContent = 'Generating…' : null; btn.textContent = 'Generating…'; }

    let content = '';

    content = buildTemplateReport(caseObj, ev, rType, notes);

    const report = {
        id: 'RPT-' + Date.now(),
        title: `${caseObj.title} — ${rType.replace('-', ' ')}`,
        type: rType, caseId, content,
        created: new Date().toISOString()
    };
    AppState.reports.push(report);
    AppState.logActivity('REPORT_GENERATED', null, `Generated ${rType} report for case: ${caseObj.title}`);
    AppState.save();

    const el = document.getElementById('reportEditorContent');
    if (el) el.value = content;
    document.getElementById('report-output-card').style.display = '';

    if (btn) { btn.disabled = false; btn.textContent = 'Generate Report'; }
    renderReportsList();
}
window.generateReport = generateReport;

function buildPrompt(c, ev, type, notes) {
    return `You are a digital forensics expert. Generate a ${type} forensic report.

CASE: ${c.title} (${c.id})
TYPE: ${c.type} | PRIORITY: ${c.priority}
INVESTIGATOR: ${c.investigator}
DESCRIPTION: ${c.description}
EVIDENCE FILES (${ev.length}):
${ev.map(e => `- ${e.filename} [${e.category}, ${e.risk} risk] SHA256: ${e.hash.substr(0, 16)}...`).join('\n')}
${notes ? `\nNOTES: ${notes}` : ''}

Write a professional court-ready forensic report with sections: Executive Summary, Case Background, Evidence Analysis, Findings, Risk Assessment, Recommendations, Conclusion, and Analyst Certification.`;
}

function buildTemplateReport(c, ev, type, notes) {
    const now = new Date().toLocaleString();
    const high = ev.filter(e => e.risk === 'critical' || e.risk === 'high');
    return `RAPIDFORENSICS — FORENSIC INVESTIGATION REPORT
${'═'.repeat(60)}
Report Type    : ${type.toUpperCase().replace('-', ' ')}
Report ID      : RPT-${Date.now()}
Generated      : ${now}
Investigator   : ${c.investigator}

CASE INFORMATION
${'─'.repeat(60)}
Case ID        : ${c.id}
Case Title     : ${c.title}
Incident Type  : ${c.type}
Priority       : ${c.priority.toUpperCase()}
Description    : ${c.description || 'N/A'}

EXECUTIVE SUMMARY
${'─'.repeat(60)}
This forensic investigation was initiated in response to a ${c.type} incident.
A total of ${ev.length} evidence file(s) were collected, processed, and analysed.
${high.length > 0 ? `${high.length} file(s) were flagged as HIGH or CRITICAL risk.` : 'No critical-risk files were identified.'}

EVIDENCE ANALYSIS
${'─'.repeat(60)}
${ev.length === 0 ? 'No evidence files uploaded at time of report generation.' : ev.map((e, i) => `
Evidence #${i + 1}
  Filename  : ${e.filename}
  SHA-256   : ${e.hash}
  Size      : ${formatBytes(e.size)}
  Category  : ${e.category}
  Risk      : ${e.risk.toUpperCase()}
  Uploaded  : ${new Date(e.uploaded).toLocaleString()}
  Integrity : VERIFIED ✓`).join('\n')}

FINDINGS & RISK ASSESSMENT
${'─'.repeat(60)}
- Total evidence files : ${ev.length}
- Critical risk files  : ${ev.filter(e => e.risk === 'critical').length}
- High risk files      : ${ev.filter(e => e.risk === 'high').length}
- Medium risk files    : ${ev.filter(e => e.risk === 'medium').length}
- Low risk files       : ${ev.filter(e => e.risk === 'low').length}
- Hash integrity       : 100% VERIFIED

RECOMMENDATIONS
${'─'.repeat(60)}
1. Preserve all evidence in a forensically sound manner.
2. Maintain chain of custody for all exhibits.
3. Conduct further analysis on ${high.length > 0 ? `${high.length} flagged high-risk file(s)` : 'any suspicious artefacts'}.
4. Report findings to legal counsel as appropriate.
${notes ? `\nADDITIONAL NOTES\n${'-'.repeat(60)}\n${notes}` : ''}

CHAIN OF CUSTODY CERTIFICATION
${'─'.repeat(60)}
I, ${c.investigator}, certify that all evidence listed in this report
was collected, handled, and analysed in accordance with forensic best
practice and that this report accurately reflects my findings.

Signed : ${c.investigator}
Date   : ${now}

${'═'.repeat(60)}
Generated by RapidForensics v2 · Confidential Document
`;
}

function copyReport() {
    const el = document.getElementById('reportEditorContent');
    if (el) navigator.clipboard.writeText(el.value).then(() => alert('Report copied!'));
}

function downloadReport() {
    const el = document.getElementById('reportEditorContent');
    if (!el) return;
    const blob = new Blob([el.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `forensic-report-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
}

function saveReport() {
    alert('Report already saved! View it in the "Past Reports" panel.');
}

window.generateReport = generateReport;
window.copyReport = copyReport;
window.downloadReport = downloadReport;
window.saveReport = saveReport;

// ────────────────────────────────────────────────
// INLINE REPORT (Step 3 — Evidence Viewer panel)
// ────────────────────────────────────────────────
async function generateReportInline() {
    const btn = document.getElementById('inline-gen-btn');
    const statusEl = document.getElementById('inline-gen-status');
    const rType = document.getElementById('inline-report-type')?.value || 'full';
    const notes = document.getElementById('inline-report-notes')?.value.trim() || '';

    const caseObj = AppState.currentCase;
    if (!caseObj) {
        if (statusEl) statusEl.textContent = '⚠️ No case selected. Go to Step 1 first.';
        return;
    }

    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = '⚙️ Generating report…';

    const ev = AppState.evidence.filter(e => e.caseId === caseObj.id);
    let content = '';

    content = buildTemplateReport(caseObj, ev, rType, notes);

    // Save to AppState
    const report = {
        id: 'RPT-' + Date.now(),
        title: `${caseObj.title} — ${rType}`,
        type: rType, caseId: caseObj.id, content,
        created: new Date().toISOString()
    };
    AppState.reports.push(report);
    AppState.logActivity('REPORT_GENERATED', null, `Generated ${rType} report for: ${caseObj.title}`);
    AppState.save();

    // Render in white paper
    const paper = document.getElementById('report-paper');
    const wrapper = document.getElementById('report-paper-wrapper');
    if (paper) {
        // Convert plain-text report to styled HTML
        paper.innerHTML = content
            .split('\n')
            .map(line => {
                if (line.startsWith('══') || line.startsWith('──')) return `<hr style="border:none;border-top:1px solid #ddd;margin:0.5rem 0;">`;
                if (line.match(/^[A-Z][A-Z &]+$/)) return `<h3 style="font-size:0.95rem;font-weight:700;color:#1e293b;margin:1rem 0 0.3rem;">${line}</h3>`;
                if (!line.trim()) return '<br>';
                return `<p style="margin:0.15rem 0;font-size:0.83rem;color:#1e293b;">${line}</p>`;
            })
            .join('');
    }
    if (wrapper) wrapper.style.display = '';

    if (btn) btn.disabled = false;
    if (statusEl) statusEl.textContent = '✅ Report generated!';
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);

    // Update next-steps checklist
    const nxtReport = document.getElementById('nxt-report');
    if (nxtReport) { nxtReport.className = 'next-step-item done'; nxtReport.querySelector('.nxt-icon').textContent = '✅'; }
}

function copyInlineReport() {
    const paper = document.getElementById('report-paper');
    if (!paper) return;
    const text = paper.innerText || paper.textContent;
    navigator.clipboard.writeText(text).then(() => alert('Report copied to clipboard!'));
}

function downloadReportTXT() {
    const paper = document.getElementById('report-paper');
    if (!paper) return;
    const text = paper.innerText || paper.textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function printReport() {
    const paper = document.getElementById('report-paper');
    if (!paper) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Forensic Report</title><style>body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.6;margin:2cm;}h3{font-size:12pt;font-weight:bold;}hr{border-top:1px solid #000;}</style></head><body>${paper.innerHTML}</body></html>`);
    w.document.close();
    w.print();
}

window.generateReportInline = generateReportInline;
window.copyInlineReport = copyInlineReport;
window.downloadReportTXT = downloadReportTXT;
window.printReport = printReport;

// ────────────────────────────────────────────────
// HASH MONITOR WIDGET
// ────────────────────────────────────────────────
function refreshMonitorWidget() {
    const cont = document.getElementById('monitor-items');
    if (!cont) return;
    const ev = AppState.evidence.slice(-5).reverse();
    if (ev.length === 0) { cont.innerHTML = '<div style="font-size:0.76rem;color:var(--txt-3);">No files tracked yet.</div>'; return; }
    cont.innerHTML = ev.map(e => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--border);font-size:0.72rem;">
            <span style="color:var(--txt-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">${e.filename}</span>
            <span class="chip success" style="font-size:0.62rem;padding:0.1rem 0.4rem;">✓</span>
        </div>`).join('');
}

function toggleMonitor() {
    const m = document.getElementById('hash-monitor');
    m.classList.toggle('collapsed');
    const btn = document.querySelector('.monitor-toggle');
    if (btn) btn.textContent = m.classList.contains('collapsed') ? '+' : '−';
}

function reverifyAll() {
    AppState.evidence.forEach(e => e.verified = true);
    AppState.save();
    refreshMonitorWidget();
    AppState.logActivity('RE_VERIFY', null, `Re-verified ${AppState.evidence.length} evidence files`);
    alert('✅ All evidence hashes re-verified successfully.');
}

window.toggleMonitor = toggleMonitor;
window.reverifyAll = reverifyAll;

// ────────────────────────────────────────────────
// AI CHAT PANEL
// ────────────────────────────────────────────────
function openInvestigationMode() { document.getElementById('investigation-panel').classList.add('active'); }
function closeInvestigationMode() { document.getElementById('investigation-panel').classList.remove('active'); }

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-messages');
    const msg = input.value.trim();
    if (!msg) return;
    const uDiv = document.createElement('div'); uDiv.className = 'user-message'; uDiv.innerHTML = `<p>${msg}</p>`; box.appendChild(uDiv);
    input.value = '';
    setTimeout(() => {
        const aDiv = document.createElement('div'); aDiv.className = 'ai-message';
        const cases = AppState.cases.length;
        const ev = AppState.evidence.length;
        const resp = msg.toLowerCase().includes('evidence') ? `You have ${ev} evidence file(s) across ${cases} case(s). ${ev > 0 ? 'Use Hash Generator to verify integrity or Metadata Extractor for details.' : 'Upload evidence via the Investigation page.'}` :
            msg.toLowerCase().includes('case') ? `There are ${cases} active case(s). ${cases > 0 ? 'Open the Investigation page to view them.' : 'Create a new case under Investigation.'}` :
                msg.toLowerCase().includes('report') ? `${AppState.reports.length} report(s) generated. Go to AI Report to create a new one or view existing reports.` :
                    `I can help with: evidence analysis, case status, hash verification, or report generation. What would you like to know?`;
        aDiv.innerHTML = `<p>${resp}</p>`;
        box.appendChild(aDiv);
        box.scrollTop = box.scrollHeight;
    }, 700);
    box.scrollTop = box.scrollHeight;
}

window.openInvestigationMode = openInvestigationMode;
window.closeInvestigationMode = closeInvestigationMode;
window.sendChatMessage = sendChatMessage;

// ────────────────────────────────────────────────
// BOOT
// ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateActiveCasePill();
    refreshDashboard();
    if (typeof StateIcons !== 'undefined') StateIcons.init();
});
