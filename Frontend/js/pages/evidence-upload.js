// ===== Evidence Upload Page Logic =====

let uploadedFilesTemp = [];

function initEvidenceUpload() {
    // Update current case banner
    updateCurrentCaseBanner();

    // Setup drag & drop
    setupDragAndDrop();

    // Setup file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Show existing evidence for current case
    displayUploadedFiles();
}

function updateCurrentCaseBanner() {
    const banner = document.getElementById('current-case-banner');
    const caseName = document.getElementById('current-case-name');

    if (AppState.currentCase) {
        caseName.textContent = `${AppState.currentCase.id} - ${AppState.currentCase.title}`;
        banner.style.display = 'block';
    } else {
        caseName.textContent = 'No case selected';
        banner.style.display = 'block';
    }
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');

    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    if (!AppState.currentCase) {
        alert('⚠️ Please create a case first before uploading evidence.');
        navigateTo('create-case');
        return;
    }

    // Check file size limit (2MB for demo)
    const maxSize = 2 * 1024 * 1024; // 2MB
    const oversized = Array.from(files).filter(f => f.size > maxSize);

    if (oversized.length > 0) {
        alert(`⚠️ Some files exceed the 2MB limit for demo mode:\n${oversized.map(f => f.name).join('\n')}`);
        return;
    }

    // Show loading
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = '<div class="drop-zone-content"><div class="drop-icon">⏳</div><h3>Processing files...</h3></div>';

    // Process each file
    for (let file of files) {
        await processFile(file);
    }

    // Reset drop zone
    dropZone.innerHTML = `
        <div class="drop-zone-content">
            <div class="drop-icon">📤</div>
            <h3>Drag & Drop Evidence Files</h3>
            <p>or</p>
            <button class="btn-primary" onclick="document.getElementById('file-input').click()">
                Browse Files
            </button>
            <p class="drop-hint">Supports all file types • Max 2MB per file in demo mode</p>
        </div>
    `;

    // Show uploaded files
    displayUploadedFiles();

    // Update dashboard stats
    if (typeof refreshDashboard === 'function') {
        refreshDashboard();
    }
}

async function processFile(file) {
    try {
        // Calculate SHA-256 hash
        const hash = await calculateFileHash(file);

        // Auto-categorize
        const category = categorizeFile(file.name);

        // Calculate risk score
        const riskScore = calculateRiskScore(file);

        // Read file content (for text files, first 10KB)
        let content = null;
        if (file.type.startsWith('text/') || file.name.endsWith('.log')) {
            const text = await file.slice(0, 10240).text();
            content = text;
        }

        // Create evidence object
        const evidence = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            caseId: AppState.currentCase.id,
            filename: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            hash: hash,
            uploaded: new Date().toISOString(),
            category: category,
            riskScore: riskScore,
            content: content,
            verified: true
        };

        // Save to state
        AppState.evidence.push(evidence);
        AppState.save();

        // Log activity
        AppState.logActivity('EVIDENCE_UPLOADED', evidence.id, `Uploaded: ${file.name}`);

        // Log hash verification
        AppState.logActivity('HASH_VERIFIED', evidence.id, `SHA-256: ${hash.substring(0, 16)}...`);

        // Trigger AI summarization (if text file)
        if (content && typeof analyzeEvidence === 'function') {
            analyzeEvidence(evidence);
        }

    } catch (error) {
        console.error('Error processing file:', error);
        alert(`Error processing ${file.name}: ${error.message}`);
    }
}

function displayUploadedFiles() {
    if (!AppState.currentCase) return;

    const caseEvidence = AppState.evidence.filter(e => e.caseId === AppState.currentCase.id);

    if (caseEvidence.length === 0) {
        document.getElementById('uploaded-files-card').style.display = 'none';
        return;
    }

    document.getElementById('uploaded-files-card').style.display = 'block';
    document.getElementById('file-count').textContent = caseEvidence.length;

    const container = document.getElementById('uploaded-files-list');
    let html = '';

    caseEvidence.forEach(evidence => {
        const icon = getFileIcon(evidence.filename);
        const timestamp = formatTimestamp(evidence.uploaded);
        const hashShort = evidence.hash.substring(0, 16) + '...';

        html += `
            <div class="card" style="margin-bottom: 1rem; padding: 1.25rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="font-size: 2.5rem;">${icon}</div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.25rem 0; color: var(--text-primary);">${evidence.filename}</h4>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
                            ${formatFileSize(evidence.size)} • ${timestamp}
                        </p>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">
                            SHA-256: ${hashShort}
                        </p>
                        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <span class="badge" style="background: ${evidence.category.color};">${evidence.category.label}</span>
                            <span class="badge" style="background: ${evidence.riskScore.color};">${evidence.riskScore.label}</span>
                            ${evidence.verified ? '<span class="badge" style="background: #10b981;">✅ Verified</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Make functions globally available
window.initEvidenceUpload = initEvidenceUpload;
window.handleFiles = handleFiles;
