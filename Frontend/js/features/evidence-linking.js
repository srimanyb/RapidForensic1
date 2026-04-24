// ===== Evidence Linking System Feature =====

// Placeholder for evidence linking feature
// In a full implementation, this would allow dragging evidence files to create visual links

function createEvidenceLink(sourceId, targetId, relationshipType) {
    const link = {
        id: Date.now(),
        source: sourceId,
        target: targetId,
        type: relationshipType, // 'related', 'supports', 'contradicts', 'sequence'
        created: new Date().toISOString()
    };

    if (!AppState.evidenceLinks) {
        AppState.evidenceLinks = [];
    }

    AppState.evidenceLinks.push(link);
    AppState.save();

    AppState.logActivity('EVIDENCE_LINKED', sourceId, `Linked to ${targetId} as ${relationshipType}`);
}

// Make functions globally available
window.createEvidenceLink = createEvidenceLink;
