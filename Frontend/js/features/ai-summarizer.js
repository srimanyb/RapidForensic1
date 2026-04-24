// ===== AI Evidence Summarizer Feature =====

function analyzeEvidence(evidence) {
    // Auto-triggered after evidence upload
    if (!evidence.content) return; // Only analyze text-based evidence

    // Simulate AI analysis (in production, call actual AI API)
    setTimeout(() => {
        const findings = generateFindingsSummary(evidence);
        showAnalysisNotification(evidence, findings);
    }, 2000);
}

function generateFindingsSummary(evidence) {
    const content = evidence.content.toLowerCase();
    const findings = [];

    // Detect suspicious patterns
    if (content.includes('failed') || content.includes('error') || content.includes('unauthorized')) {
        findings.push('⚠️ Suspicious login attempts detected');
    }

    if (content.includes('3am') || content.includes('02:') || content.includes('03:')) {
        findings.push('🌙 Activity detected at unusual hours (3AM)');
    }

    if (content.includes('admin') || content.includes('root') || content.includes('sudo')) {
        findings.push('🔑 Elevated privilege access detected');
    }

    if (content.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
        findings.push('🌐 IP addresses found in logs');
    }

    // Add generic finding if nothing specific found
    if (findings.length === 0) {
        findings.push('✅ No immediate suspicious patterns detected');
    }

    return findings;
}

function showAnalysisNotification(evidence, findings) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: rgba(30, 8, 54, 0.98);
        border: 2px solid rgba(168, 85, 247, 0.5);
        border-radius: 16px;
        padding: 1.5rem;
        max-width: 400px;
        z-index: 999;
        box-shadow: 0 8px 32px rgba(168, 85, 247, 0.4);
        animation: slideInRight 0.4s ease;
    `;

    let html = `
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
            <span style="font-size: 1.5rem;">🔍</span>
            <h4 style="margin: 0; color: var(--text-primary);">AI Analysis Complete</h4>
        </div>
        <p style="margin: 0 0 0.75rem 0; color: var(--text-secondary); font-size: 0.9rem;">
            <strong>${evidence.filename}</strong>
        </p>
        <div style="background: rgba(15, 3, 34, 0.5); padding: 1rem; border-radius: 8px;">
            <p style="margin: 0 0 0.5rem 0; color: var(--accent-cyan); font-weight: 600; font-size: 0.85rem;">Key Findings:</p>
    `;

    findings.forEach(finding => {
        html += `<p style="margin: 0.25rem 0; font-size: 0.85rem; color: var(--text-secondary);">${finding}</p>`;
    });

    html += `
        </div>
        <button onclick="this.parentElement.remove()" style="
            margin-top: 1rem;
            width: 100%;
            padding: 0.5rem;
            background: rgba(168, 85, 247, 0.2);
            border: 1px solid rgba(168, 85, 247, 0.3);
            border-radius: 8px;
            color: var(--accent-purple);
            cursor: pointer;
            font-weight: 600;
        ">Dismiss</button>
    `;

    notification.innerHTML = html;
    document.body.appendChild(notification);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);

    AppState.logActivity('AI_ANALYSIS', evidence.id, `Analyzed: ${findings.join(', ')}`);
}

// Make functions globally available
window.analyzeEvidence = analyzeEvidence;
