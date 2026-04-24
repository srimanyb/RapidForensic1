// ===== Timeline & Analytics Page Logic =====

function loadTimeline() {
    displayCaseTimeline();
    initAnalyticsCharts();
}

function displayCaseTimeline() {
    const timeline = document.getElementById('case-timeline');

    if (!AppState.currentCase) {
        timeline.innerHTML = '<p class="empty-state">Please select a case first.</p>';
        return;
    }

    // Get all activities for current case
    const caseActivities = AppState.chainOfCustody.filter(entry => {
        // Include case-level activities and evidence activities for this case
        if (!entry.evidenceId) return true; // Case-level activity
        const evidence = AppState.evidence.find(e => e.id === entry.evidenceId);
        return evidence && evidence.caseId === AppState.currentCase.id;
    });

    if (caseActivities.length === 0) {
        timeline.innerHTML = '<p class="empty-state">No activity yet.</p>';
        return;
    }

    // Sort by timestamp (newest first)
    caseActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let html = '';
    caseActivities.forEach(entry => {
        const icon = getActivityIcon(entry.action);
        const timestamp = formatTimestamp(entry.timestamp);

        html += `
            <div class="timeline-event">
                <h4>${icon} ${getActivityTitle(entry.action)}</h4>
                <p>${entry.details || entry.action}</p>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${timestamp} • ${entry.user}</p>
            </div>
        `;
    });

    timeline.innerHTML = html;
}

function getActivityIcon(action) {
    const iconMap = {
        'CASE_CREATED': '📁',
        'EVIDENCE_UPLOADED': '📤',
        'HASH_VERIFIED': '✅',
        'EVIDENCE_VIEWED': '👁️',
        'REPORT_GENERATED': '📄',
        'REPORT_EDITED': '✏️',
        'PAGE_NAVIGATED': '🔄',
        'DATA_EXPORTED': '📥',
        'AI_QUERY': '🤖',
        'INVESTIGATION_MODE_OPENED': '🔍'
    };
    return iconMap[action] || '•';
}

function getActivityTitle(action) {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function initAnalyticsCharts() {
    initEvidenceTypeChart();
    initRiskScoreChart();
}

function initEvidenceTypeChart() {
    const canvas = document.getElementById('evidence-type-chart');
    if (!canvas || !AppState.currentCase) return;

    const caseEvidence = AppState.evidence.filter(e => e.caseId === AppState.currentCase.id);

    // Count by category
    const categoryCounts = {};
    caseEvidence.forEach(e => {
        const cat = e.category.label;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const ctx = canvas.getContext('2d');

    if (window.evidenceTypeChartInstance) {
        window.evidenceTypeChartInstance.destroy();
    }

    window.evidenceTypeChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(99, 102, 241, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e0d4f7',
                        padding: 15
                    }
                }
            }
        }
    });
}

function initRiskScoreChart() {
    const canvas = document.getElementById('risk-score-chart');
    if (!canvas || !AppState.currentCase) return;

    const caseEvidence = AppState.evidence.filter(e => e.caseId === AppState.currentCase.id);

    // Count by risk level
    const riskCounts = {
        'Low': 0,
        'Medium': 0,
        'Critical': 0
    };

    caseEvidence.forEach(e => {
        const level = e.riskScore.level;
        if (level === 'low') riskCounts['Low']++;
        else if (level === 'medium') riskCounts['Medium']++;
        else if (level === 'critical') riskCounts['Critical']++;
    });

    const ctx = canvas.getContext('2d');

    if (window.riskScoreChartInstance) {
        window.riskScoreChartInstance.destroy();
    }

    window.riskScoreChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Low', 'Medium', 'Critical'],
            datasets: [{
                label: 'Evidence Count',
                data: [riskCounts['Low'], riskCounts['Medium'], riskCounts['Critical']],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9f7bc4',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(168, 85, 247, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#9f7bc4'
                    },
                    grid: {
                        color: 'rgba(168, 85, 247, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e0d4f7'
                    }
                }
            }
        }
    });
}

function exportTimeline() {
    alert('📥 Timeline export feature coming soon! (Would generate PDF with timeline and charts)');
    AppState.logActivity('DATA_EXPORTED', null, 'Attempted to export timeline');
}

// Make functions globally available
window.loadTimeline = loadTimeline;
window.exportTimeline = exportTimeline;
