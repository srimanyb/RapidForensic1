/**
 * RapidForensics — App Bootstrap (Stub)
 *
 * NOTE: All real application logic lives in workflow.js, which is loaded after
 * this file.  This file only provides thin shims for the utility functions that
 * other page scripts (pages/*.js, features/*.js) may call before workflow.js
 * runs, plus a few UI helpers used from inline onclick handlers.
 *
 * DO NOT add duplicate AppState, navigateTo, or logout here — workflow.js owns
 * those and will overwrite anything set earlier if you do.
 */

// ── Utility helpers (used by pages/* and features/* scripts) ─────────────────

/** Generate a human-readable case ID (fallback; workflow.js doesn't use this). */
function generateCaseID() {
    const d = new Date();
    const ds = d.toISOString().split('T')[0];
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `CASE-${ds}-${rnd}`;
}

/** Format bytes into a human-readable size string. */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

/** Return a file-type emoji for a given filename. */
function getFileIcon(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    return {
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️',
        pdf: '📄', doc: '📄', docx: '📄', txt: '📋', log: '📋',
        xls: '📊', xlsx: '📊', csv: '📊',
        js: '📜', py: '📜', sh: '📜', bat: '🦠', ps1: '📜',
        exe: '🦠', dll: '🦠', cmd: '🦠',
        eml: '📧', msg: '📧', pst: '📧',
        pcap: '🌐', pcapng: '🌐',
        zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
    }[ext] || '📁';
}

// Expose so feature scripts can import them without module syntax
window.generateCaseID = generateCaseID;
window.formatFileSize = formatFileSize;
window.getFileIcon = getFileIcon;
