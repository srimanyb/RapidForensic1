// ===== Risk Scoring Feature =====

// Risk scoring logic is already implemented in app.js (calculateRiskScore function)
// This file provides additional risk analysis features

function getRiskDistribution() {
    const distribution = {
        low: 0,
        medium: 0,
        critical: 0
    };

    AppState.evidence.forEach(e => {
        distribution[e.riskScore.level]++;
    });

    return distribution;
}

function getHighRiskEvidence() {
    return AppState.evidence.filter(e => e.riskScore.level === 'critical');
}

function generateRiskReport() {
    const distribution = getRiskDistribution();
    const highRisk = getHighRiskEvidence();

    let report = `**Risk Assessment Summary**\n\n`;
    report += `Total Evidence: ${AppState.evidence.length}\n`;
    report += `• Low Risk: ${distribution.low} file(s)\n`;
    report += `• Medium Risk: ${distribution.medium} file(s)\n`;
    report += `• Critical Risk: ${distribution.critical} file(s)\n\n`;

    if (highRisk.length > 0) {
        report += `**Critical Risk Files:**\n`;
        highRisk.forEach(e => {
            report += `• ${e.filename} (Score: ${e.riskScore.score}/100)\n`;
        });
    }

    return report;
}

// Make functions globally available
window.getRiskDistribution = getRiskDistribution;
window.getHighRiskEvidence = getHighRiskEvidence;
window.generateRiskReport = generateRiskReport;
