// ===== Hash Integrity Monitor Feature =====

// Hash monitor is already implemented in app.html and app.js
// This file contains additional hash verification logic

function updateHashMonitor() {
    const monitor = document.getElementById('hash-monitor');
    if (!monitor) return;

    const totalEvidence = AppState.evidence.length;
    const verifiedEvidence = AppState.evidence.filter(e => e.verified).length;

    const statusDiv = monitor.querySelector('.integrity-status');

    if (totalEvidence === 0) {
        statusDiv.innerHTML = '<span class="status-icon">🟢</span><span>All Evidence Verified</span>';
        return;
    }

    if (verifiedEvidence === totalEvidence) {
        statusDiv.innerHTML = `<span class="status-icon">🟢</span><span>All ${totalEvidence} files verified</span>`;
    } else {
        const failed = totalEvidence - verifiedEvidence;
        statusDiv.innerHTML = `<span class="status-icon">🔴</span><span>${failed} file(s) modified!</span>`;

        // Show breach alert
        showBreachAlert(failed);
    }
}

function showBreachAlert(failedCount) {
    alert(`⚠️ INTEGRITY BREACH DETECTED!\n\n${failedCount} evidence file(s) have been modified.\nHashes no longer match original values.\n\nCheck Settings → Data Integrity Logs for details.`);
}

// Update monitor when evidence changes
setInterval(updateHashMonitor, 5000);

// Make functions globally available
window.updateHashMonitor = updateHashMonitor;
