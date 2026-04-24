// ===== Settings Page Logic =====

function loadSettings() {
    populateSettingsForm();
    loadIntegrityLogs();
}

function populateSettingsForm() {
    // Load saved settings
    const savedName = localStorage.getItem('rf_user_name') || '';
    const savedEmail = localStorage.getItem('rf_user_email') || '';
    const savedApiKey = AppState.apiKey || '';

    document.getElementById('settings-name').value = savedName;
    document.getElementById('settings-email').value = savedEmail;
    document.getElementById('api-key').value = savedApiKey;
}

function saveProfile() {
    const name = document.getElementById('settings-name').value.trim();
    const email = document.getElementById('settings-email').value.trim();

    if (!name || !email) {
        alert('Please fill in all fields');
        return;
    }

    localStorage.setItem('rf_user_name', name);
    localStorage.setItem('rf_user_email', email);

    // Update user display in sidebar
    const userName = document.querySelector('.user-name');
    if (userName) {
        userName.textContent = name;
    }

    alert('✅ Profile saved successfully!');
    AppState.logActivity('SETTINGS_UPDATED', null, 'Updated user profile');
}

function saveApiKey() {
    const apiKey = document.getElementById('api-key').value.trim();

    if (!apiKey) {
        alert('Please enter a valid API key');
        return;
    }

    AppState.apiKey = apiKey;
    AppState.save();

    alert('✅ API Key saved successfully! AI features are now enabled.');
    AppState.logActivity('SETTINGS_UPDATED', null, 'Updated AI API key');
}

function loadIntegrityLogs() {
    const tbody = document.getElementById('integrity-logs-body');

    // Get all hash verification activities
    const verifications = AppState.chainOfCustody.filter(entry =>
        entry.action === 'HASH_VERIFIED' || entry.action === 'EVIDENCE_UPLOADED'
    );

    if (verifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No integrity logs yet</td></tr>';
        return;
    }

    let html = '';
    verifications.reverse().forEach(entry => {
        const evidence = AppState.evidence.find(e => e.id === entry.evidenceId);
        if (!evidence) return;

        const timestamp = formatTimestamp(entry.timestamp);
        const status = evidence.verified ? '🟢 Verified' : '🔴 Failed';

        html += `
            <tr>
                <td>${timestamp}</td>
                <td>${evidence.filename}</td>
                <td><code style="font-size: 0.75rem;">${evidence.hash.substring(0, 32)}...</code></td>
                <td>${status}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function saveProfile() {
    const name = document.getElementById('settings-name').value.trim();
    const email = document.getElementById('settings-email').value.trim();

    if (!name || !email) {
        alert('Please fill in all fields');
        return;
    }

    localStorage.setItem('rf_user_name', name);
    localStorage.setItem('rf_user_email', email);

    alert('✅ Profile saved successfully!');
    AppState.logActivity('SETTINGS_UPDATED', null, 'Updated user profile');
}

// Make functions globally available
window.loadSettings = loadSettings;
window.saveProfile = saveProfile;
window.saveApiKey = saveApiKey;
