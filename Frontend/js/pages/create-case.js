// ===== Create Case Page Logic =====

// Initialize form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-case-form');
    if (form) {
        // Generate case ID on page load
        updateCaseID();

        // Setup tag selection
        setupTagSelection();

        // Form submission
        form.addEventListener('submit', handleCaseSubmit);
    }
});

function updateCaseID() {
    const caseIdInput = document.getElementById('case-id');
    if (caseIdInput) {
        caseIdInput.value = generateCaseID();
    }
}

function setupTagSelection() {
    const tagButtons = document.querySelectorAll('.tag-btn');
    const selectedTags = new Set();

    tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;

            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
                btn.classList.remove('selected');
            } else {
                selectedTags.add(tag);
                btn.classList.add('selected');
            }

            updateSelectedTagsDisplay(selectedTags);
        });
    });
}

function updateSelectedTagsDisplay(selectedTags) {
    const container = document.getElementById('selected-tags');
    if (selectedTags.size === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<div style="margin-top: 0.75rem;">Selected: ';
    selectedTags.forEach(tag => {
        html += `<span class="badge" style="margin-right: 0.5rem;">${tag}</span>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function handleCaseSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('case-title').value.trim();
    const investigator = document.getElementById('investigator-name').value.trim();
    const caseId = document.getElementById('case-id').value;
    const description = document.getElementById('case-description').value.trim();

    // Get selected tags
    const selectedTagBtns = document.querySelectorAll('.tag-btn.selected');
    const tags = Array.from(selectedTagBtns).map(btn => btn.dataset.tag);

    if (!title || !investigator) {
        alert('Please fill in all required fields');
        return;
    }

    // Create case object
    const newCase = {
        id: caseId,
        title: title,
        investigator: investigator,
        description: description,
        tags: tags,
        created: new Date().toISOString(),
        status: 'active'
    };

    // Save to state
    AppState.cases.push(newCase);
    AppState.currentCase = newCase;
    AppState.save();

    // Log activity
    AppState.logActivity('CASE_CREATED', null, `Created case: ${title}`);

    // Show success and navigate
    alert(`✅ Case "${title}" created successfully!`);

    // Reset form
    document.getElementById('create-case-form').reset();
    updateCaseID();
    document.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('selected-tags').innerHTML = '';

    // Navigate to evidence upload
    navigateTo('evidence-upload');
}

// Make functions globally available
window.updateCaseID = updateCaseID;
window.handleCaseSubmit = handleCaseSubmit;
