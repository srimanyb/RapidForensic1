// ===== Evidence Viewer Page Logic =====

function loadEvidenceViewer() {
    displayEvidenceGrid();
    setupViewToggle();
}

function setupViewToggle() {
    const toggleBtns = document.querySelectorAll('.view-toggle .toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            // Toggle between grid and list view
            const grid = document.getElementById('evidence-grid');
            if (view === 'list') {
                grid.style.gridTemplateColumns = '1fr';
            } else {
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
            }
        });
    });
}

function displayEvidenceGrid() {
    const grid = document.getElementById('evidence-grid');

    if (!AppState.currentCase) {
        grid.innerHTML = '<p class="empty-state">Please select a case first.</p>';
        return;
    }

    const caseEvidence = AppState.evidence.filter(e => e.caseId === AppState.currentCase.id);

    if (caseEvidence.length === 0) {
        grid.innerHTML = '<p class="empty-state">No evidence files yet. Upload files to view them here.</p>';
        return;
    }

    let html = '';
    caseEvidence.forEach(evidence => {
        const icon = getFileIcon(evidence.filename);
        html += `
            <div class="evidence-card" onclick="viewEvidence('${evidence.id}')">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <div style="font-size: 2.5rem;">${icon}</div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0; color: var(--text-primary); font-size: 0.95rem;">${evidence.filename}</h4>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">${formatFileSize(evidence.size)}</p>
                    </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    <span class="badge" style="background: ${evidence.category.color}; font-size: 0.75rem;">${evidence.category.label}</span>
                    <span class="badge" style="background: ${evidence.riskScore.color}; font-size: 0.75rem;">${evidence.riskScore.label.split(' ')[1]}</span>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function viewEvidence(evidenceId) {
    const evidence = AppState.evidence.find(e => e.id === evidenceId);
    if (!evidence) return;

    const modal = document.getElementById('evidence-modal');
    const preview = document.getElementById('evidence-preview');

    let html = `
        <h2 style="margin-bottom: 1.5rem;">${evidence.filename}</h2>
        <div style="background: rgba(15, 3, 34, 0.5); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
            <p><strong>Size:</strong> ${formatFileSize(evidence.size)}</p>
            <p><strong>Type:</strong> ${evidence.type}</p>
            <p><strong>Uploaded:</strong> ${formatTimestamp(evidence.uploaded)}</p>
            <p><strong>SHA-256:</strong> <code style="font-size: 0.85rem;">${evidence.hash}</code></p>
            <p><strong>Category:</strong> ${evidence.category.label}</p>
            <p><strong>Risk Score:</strong> ${evidence.riskScore.label} (${evidence.riskScore.score}/100)</p>
        </div>
    `;

    // Show preview based on file type
    if (evidence.type.startsWith('image/')) {
        html += `<div style="text-align: center;"><p style="color: var(--text-muted);">Image preview not available in demo (file not stored)</p></div>`;
    } else if (evidence.content) {
        html += `
            <h3>Content Preview</h3>
            <div style="background: rgba(15, 3, 34, 0.8); padding: 1rem; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                <pre style="margin: 0; color: var(--text-secondary); font-size: 0.85rem; white-space: pre-wrap;">${evidence.content}</pre>
            </div>
        `;
    } else {
        html += `<p style="color: var(--text-muted);">Preview not available for this file type.</p>`;
    }

    preview.innerHTML = html;
    modal.classList.add('active');

    AppState.logActivity('EVIDENCE_VIEWED', evidenceId, `Viewed: ${evidence.filename}`);
}

function closeEvidenceModal() {
    document.getElementById('evidence-modal').classList.remove('active');
}

// Make functions globally available
window.loadEvidenceViewer = loadEvidenceViewer;
window.viewEvidence = viewEvidence;
window.closeEvidenceModal = closeEvidenceModal;
