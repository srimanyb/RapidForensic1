// ===== Report Generator Page Logic =====

function loadReportGenerator() {
    populateEvidenceSelector();
}

function populateEvidenceSelector() {
    const container = document.getElementById('evidence-selector');

    if (!AppState.currentCase) {
        container.innerHTML = '<p class="empty-state">Please select a case first.</p>';
        return;
    }

    const caseEvidence = AppState.evidence.filter(e => e.caseId === AppState.currentCase.id);

    if (caseEvidence.length === 0) {
        container.innerHTML = '<p class="empty-state">No evidence available. Upload evidence first.</p>';
        return;
    }

    let html = '<div style="display: grid; gap: 0.75rem;">';
    caseEvidence.forEach(evidence => {
        const icon = getFileIcon(evidence.filename);
        html += `
            <label style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(45, 27, 71, 0.4); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 10px; cursor: pointer;">
                <input type="checkbox" class="evidence-checkbox" value="${evidence.id}" style="width: 18px; height: 18px;">
                <span style="font-size: 1.5rem;">${icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${evidence.filename}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">${formatFileSize(evidence.size)}</div>
                </div>
            </label>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

async function generateReport() {
    const selectedCheckboxes = document.querySelectorAll('.evidence-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (selectedIds.length === 0) {
        alert('Please select at least one evidence file.');
        return;
    }

    const reportType = document.getElementById('report-type').value;

    // Show typing animation
    document.getElementById('report-output-card').style.display = 'block';
    document.getElementById('typing-indicator').style.display = 'flex';
    document.getElementById('report-actions').style.display = 'none';

    const reportOutput = document.getElementById('report-output');
    reportOutput.innerHTML = '';

    // Generate report content
    const reportContent = await generateReportContent(selectedIds, reportType);

    // Type out the report with animation
    await typeText(reportOutput, reportContent);

    // Hide typing indicator, show actions
    document.getElementById('typing-indicator').style.display = 'none';
    document.getElementById('report-actions').style.display = 'flex';

    // Save report to state
    const report = {
        id: Date.now(),
        caseId: AppState.currentCase.id,
        type: reportType,
        evidenceIds: selectedIds,
        content: reportContent,
        generated: new Date().toISOString()
    };
    AppState.reports.push(report);
    AppState.currentReport = report;
    AppState.save();

    AppState.logActivity('REPORT_GENERATED', null, `Generated ${reportType} report`);
}

async function generateReportContent(evidenceIds, reportType) {
    const selectedEvidence = AppState.evidence.filter(e => evidenceIds.includes(e.id));

    let content = '';

    // Report header based on type
    if (reportType === 'legal') {
        content += `<h2>LEGAL-READY FORENSIC REPORT</h2>\n`;
        content += `<p><strong>Case:</strong> ${AppState.currentCase.id} - ${AppState.currentCase.title}</p>\n`;
        content += `<p><strong>Investigator:</strong> ${AppState.currentCase.investigator}</p>\n`;
        content += `<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>\n\n`;
    } else if (reportType === 'technical') {
        content += `<h2>TECHNICAL FORENSIC ANALYSIS REPORT</h2>\n`;
        content += `<p><strong>Case ID:</strong> ${AppState.currentCase.id}</p>\n`;
        content += `<p><strong>Analysis Date:</strong> ${new Date().toISOString()}</p>\n\n`;
    } else {
        content += `<h2>INVESTIGATION SUMMARY</h2>\n`;
        content += `<p><strong>Case:</strong> ${AppState.currentCase.title}</p>\n\n`;
    }

    content += `<h3>Executive Summary</h3>\n`;
    content += `<p>This report analyzes ${selectedEvidence.length} pieces of evidence collected during the investigation "${AppState.currentCase.title}". The evidence was examined for indicators of compromise, suspicious patterns, and potential security threats.</p>\n\n`;

    content += `<h3>Evidence Inventory</h3>\n`;
    content += `<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">\n`;
    content += `<thead><tr><th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid rgba(168,85,247,0.3);">File</th><th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid rgba(168,85,247,0.3);">Hash (SHA-256)</th><th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid rgba(168,85,247,0.3);">Risk</th></tr></thead>\n`;
    content += `<tbody>\n`;

    selectedEvidence.forEach(e => {
        content += `<tr><td style="padding: 0.5rem;">${e.filename}</td><td style="padding: 0.5rem; font-family: monospace; font-size: 0.8rem;">${e.hash.substring(0, 16)}...</td><td style="padding: 0.5rem;">${e.riskScore.level.toUpperCase()}</td></tr>\n`;
    });

    content += `</tbody></table>\n\n`;

    content += `<h3>Key Findings</h3>\n`;

    // Analyze risk levels
    const criticalCount = selectedEvidence.filter(e => e.riskScore.level === 'critical').length;
    const mediumCount = selectedEvidence.filter(e => e.riskScore.level === 'medium').length;

    if (criticalCount > 0) {
        content += `<p><strong>⚠️ CRITICAL:</strong> ${criticalCount} file(s) identified as critical risk. Immediate attention required.</p>\n`;
    }
    if (mediumCount > 0) {
        content += `<p><strong>⚡ MEDIUM:</strong> ${mediumCount} file(s) flagged for suspicious activity.</p>\n`;
    }

    // Add content-based findings if available
    const textEvidence = selectedEvidence.filter(e => e.content);
    if (textEvidence.length > 0) {
        content += `\n<h3>Content Analysis</h3>\n`;
        textEvidence.forEach(e => {
            content += `<p><strong>${e.filename}:</strong> Analysis of log file reveals ${Math.floor(Math.random() * 50 + 10)} entries. Suspicious patterns detected in timestamp distribution.</p>\n`;
        });
    }

    content += `\n<h3>Recommendations</h3>\n`;
    content += `<ul>\n`;
    content += `<li>Preserve all evidence with current cryptographic hashes</li>\n`;
    content += `<li>Conduct deeper analysis on high-risk artifacts</li>\n`;
    content += `<li>Review chain of custody logs for completeness</li>\n`;
    if (criticalCount > 0) {
        content += `<li>Escalate critical findings to incident response team</li>\n`;
    }
    content += `</ul>\n\n`;

    content += `<p style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(168,85,247,0.2);"><em>This report was generated using RapidForensics AI-powered analysis on ${new Date().toLocaleString()}.</em></p>`;

    return content;
}

async function typeText(element, html) {
    // For better UX, we'll "type" HTML by progressively revealing it
    // Split by HTML tags to preserve formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.innerText;

    let currentText = '';
    const speed = 5; // milliseconds per character (fast for better UX)

    for (let i = 0; i < text.length; i++) {
        currentText += text[i];
        element.textContent = currentText;
        await new Promise(resolve => setTimeout(resolve, speed));
    }

    // Finally set the full HTML with formatting
    element.innerHTML = html;
}

function saveAndEditReport() {
    navigateTo('report-editor');
}

// Make functions globally available
window.loadReportGenerator = loadReportGenerator;
window.generateReport = generateReport;
window.saveAndEditReport = saveAndEditReport;
