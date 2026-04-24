// ===== Court-Ready Report Export Feature =====

// Placeholder for court export using jsPDF
// Full implementation would use jsPDF library to generate professional PDFs

function exportCourtReport() {
    if (!AppState.currentReport) {
        alert('No report available to export. Generate a report first.');
        return;
    }

    // In production, use jsPDF to generate PDF
    alert(`📄 Court-Ready PDF Export\n\nThis feature requires jsPDF library integration.\n\nWould generate:\n✓ Professional cover page\n✓ Table of contents\n✓ Evidence inventory with hashes\n✓ Chain of custody log\n✓ Report body with formatting\n✓ Signature fields\n\nFor now, downloading as HTML...`);

    // Export as HTML for demo
    const reportHTML = generateCourtHTML();
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Court-Report-${AppState.currentCase.id}-${Date.now()}.html`;
    link.click();

    URL.revokeObjectURL(url);

    AppState.logActivity('COURT_EXPORT', null, 'Exported court-ready report');
}

function generateCourtHTML() {
    const report = AppState.currentReport;
    const caseInfo = AppState.currentCase;

    return `<!DOCTYPE html>
<html>
<head>
    <title>Forensic Report - ${caseInfo.id}</title>
    <style>
        body { font-family: 'Times New Roman', serif; max-width: 8.5in; margin: 0 auto; padding: 2in; background: white; color: black; }
        h1 { text-align: center; border-bottom: 3px solid black; padding-bottom: 0.5em; }
        .cover { page-break-after: always; }
        .metadata { margin: 2em 0; }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        th, td { border: 1px solid black; padding: 0.5em; text-align: left; }
        th { background: #f0f0f0; }
        code { background: #f5f5f5; padding: 0.2em 0.4em; font-family: 'Courier New', monospace; }
    </style>
</head>
<body>
    <div class="cover">
        <h1>FORENSIC INVESTIGATION REPORT</h1>
        <div class="metadata">
            <p><strong>Case ID:</strong> ${caseInfo.id}</p>
            <p><strong>Case Title:</strong> ${caseInfo.title}</p>
            <p><strong>Investigator:</strong> ${caseInfo.investigator}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
    </div>
    
    <h2>Chain of Custody</h2>
    <table>
        <thead>
            <tr><th>Timestamp</th><th>Action</th><th>User</th><th>Details</th></tr>
        </thead>
        <tbody>
            ${AppState.chainOfCustody.slice(-10).map(entry => `
                <tr>
                    <td>${new Date(entry.timestamp).toLocaleString()}</td>
                    <td>${entry.action}</td>
                    <td>${entry.user}</td>
                    <td>${entry.details}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <h2>Report Content</h2>
    ${report.content}
    
    <div style="margin-top: 4em; border-top: 2px solid black; padding-top: 1em;">
        <p><strong>Digital Signature:</strong> __________________________</p>
        <p><strong>Date:</strong> __________________________</p>
    </div>
</body>
</html>`;
}

// Make functions globally available
window.exportCourtReport = exportCourtReport;
