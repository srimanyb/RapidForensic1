// ===== Report Editor Page Logic =====

let autoSaveInterval = null;

function loadReportEditor() {
    const editor = document.getElementById('report-editor');

    // Load current report if available
    if (AppState.currentReport) {
        editor.innerHTML = AppState.currentReport.content;
    } else {
        editor.innerHTML = '<p>No report loaded. Generate a report first.</p>';
    }

    // Setup auto-save
    setupAutoSave();

    AppState.logActivity('REPORT_OPENED', null, 'Opened report editor');
}

function setupAutoSave() {
    // Clear existing interval
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }

    // Auto-save every 5 seconds
    autoSaveInterval = setInterval(() => {
        saveReport(true);
    }, 5000);
}

function saveReport(isAutoSave = false) {
    const editor = document.getElementById('report-editor');
    const content = editor.innerHTML;

    if (AppState.currentReport) {
        AppState.currentReport.content = content;
        AppState.currentReport.lastEdited = new Date().toISOString();
        AppState.save();

        if (!isAutoSave) {
            AppState.logActivity('REPORT_EDITED', null, 'Manually saved report edits');
        }

        // Show save indicator
        const indicator = document.getElementById('auto-save-indicator');
        indicator.textContent = isAutoSave ? 'Auto-saved' : 'Saved';
        indicator.style.color = 'var(--accent-cyan)';

        setTimeout(() => {
            indicator.style.color = 'var(--text-muted)';
        }, 2000);
    }
}

function formatText(command) {
    document.execCommand(command, false, null);
    AppState.logActivity('REPORT_EDITED', null, `Applied format: ${command}`);
}

function highlightText(color) {
    const selection = window.getSelection();
    if (!selection.toString()) {
        alert('Please select text to highlight');
        return;
    }

    const colorMap = {
        'yellow': '#fbbf24',
        'red': '#ef4444',
        'green': '#10b981'
    };

    document.execCommand('hiliteColor', false, colorMap[color]);
    AppState.logActivity('REPORT_EDITED', null, `Highlighted text in ${color}`);
}

function insertEvidenceRef() {
    if (!AppState.currentCase) return;

    const caseEvidence = AppState.evidence.filter(e => e.caseId === AppState.currentCase.id);

    if (caseEvidence.length === 0) {
        alert('No evidence available to reference');
        return;
    }

    // Create a simple selection dialog
    let html = 'Select evidence to insert:\n\n';
    caseEvidence.forEach((e, index) => {
        html += `${index + 1}. ${e.filename}\n`;
    });

    const choice = prompt(html + '\nEnter number:');
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < caseEvidence.length) {
        const evidence = caseEvidence[index];
        const refText = `[Evidence: ${evidence.filename} | Hash: ${evidence.hash.substring(0, 16)}...]`;
        document.execCommand('insertHTML', false, `<span style="background: rgba(168,85,247,0.2); padding: 0.125rem 0.5rem; border-radius: 4px; font-family: monospace; font-size: 0.9em;">${refText}</span>`);

        AppState.logActivity('REPORT_EDITED', evidence.id, `Inserted reference to ${evidence.filename}`);
    }
}

function exportReport() {
    // Navigate to report export flow (can be enhanced with actual PDF generation)
    if (confirm('Export report as PDF? (Requires court export feature)')) {
        saveReport(false);
        // In production, this would trigger court export
        alert('Report saved. Use the Court Export feature (coming soon) to generate PDF.');
    }
}

// Make functions globally available
window.loadReportEditor = loadReportEditor;
window.formatText = formatText;
window.highlightText = highlightText;
window.insertEvidenceRef = insertEvidenceRef;
window.exportReport = exportReport;
