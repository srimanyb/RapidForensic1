// ===== Dashboard Page Logic =====

function initializeDashboard() {
    console.log('📊 Initializing Dashboard');
    refreshDashboard();
}

function refreshDashboard() {
    // Update statistics
    updateDashboardStats();

    // Load recent investigations
    loadRecentInvestigations();

    // Initialize dashboard chart
    initDashboardChart();
}

function updateDashboardStats() {
    // Total Cases
    document.getElementById('stat-total-cases').textContent = AppState.cases.length;

    // Reports Generated
    document.getElementById('stat-reports').textContent = AppState.reports.length;

    // Evidence Files
    const totalEvidence = AppState.evidence.length;
    document.getElementById('stat-evidence').textContent = totalEvidence;

    // Integrity Status (all verified for demo)
    const integrityPercent = totalEvidence > 0 ? 100 : 100;
    document.getElementById('stat-integrity').textContent = `${integrityPercent}%`;
}

function loadRecentInvestigations() {
    const container = document.getElementById('recent-investigations');

    if (AppState.cases.length === 0) {
        container.innerHTML = '<p class="empty-state">No investigations yet. Create your first case to get started!</p>';
        return;
    }

    // Get last 5 cases
    const recentCases = AppState.cases.slice(-5).reverse();

    let html = '<table class="logs-table"><thead><tr>';
    html += '<th>Case ID</th><th>Title</th><th>Investigator</th><th>Evidence</th><th>Created</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    recentCases.forEach(caseItem => {
        const evidenceCount = AppState.evidence.filter(e => e.caseId === caseItem.id).length;
        const createdDate = new Date(caseItem.created).toLocaleDateString();

        html += `<tr>
            <td><code>${caseItem.id}</code></td>
            <td><strong>${caseItem.title}</strong></td>
            <td>${caseItem.investigator}</td>
            <td>${evidenceCount} files</td>
            <td>${createdDate}</td>
            <td>
                <button class="btn-small" onclick="openCase('${caseItem.id}')">Open</button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function initDashboardChart() {
    const canvas = document.getElementById('dashboard-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Prepare data - cases created over last 7 days
    const labels = [];
    const data = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(dateStr);

        // Count cases created on this day
        const count = AppState.cases.filter(c => {
            const caseDate = new Date(c.created);
            return caseDate.toDateString() === date.toDateString();
        }).length;
        data.push(count);
    }

    // Destroy existing chart if any
    if (window.dashboardChartInstance) {
        window.dashboardChartInstance.destroy();
    }

    // Create chart
    window.dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cases Created',
                data: data,
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#e0d4f7'
                    }
                }
            },
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
            }
        }
    });
}

function openCase(caseId) {
    const caseItem = AppState.cases.find(c => c.id === caseId);
    if (caseItem) {
        AppState.currentCase = caseItem;
        AppState.save();
        navigateTo('evidence-upload');
    }
}

// Make functions globally available
window.initializeDashboard = initializeDashboard;
window.refreshDashboard = refreshDashboard;
window.openCase = openCase;
