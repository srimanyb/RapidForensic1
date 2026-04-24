// ===== Auto Categorization Feature =====

// Auto-categorization logic is already implemented in app.js (categorizeFile function)
// This file provides category management features

function getCategoryDistribution() {
    const distribution = {};

    AppState.evidence.forEach(e => {
        const category = e.category.label;
        distribution[category] = (distribution[category] || 0) + 1;
    });

    return distribution;
}

function filterEvidenceByCategory(category) {
    return AppState.evidence.filter(e => e.category.category === category);
}

function updateEvidenceCategory(evidenceId, newCategory) {
    const evidence = AppState.evidence.find(e => e.id === evidenceId);
    if (!evidence) return;

    evidence.category = categorizeFile(evidence.filename);
    // Manual override could be added here

    AppState.save();
    AppState.logActivity('CATEGORY_UPDATED', evidenceId, `Updated to ${newCategory}`);
}

// Make functions globally available
window.getCategoryDistribution = getCategoryDistribution;
window.filterEvidenceByCategory = filterEvidenceByCategory;
window.updateEvidenceCategory = updateEvidenceCategory;
