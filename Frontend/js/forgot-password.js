// ===== Forgot Password Form Handler =====

document.addEventListener('DOMContentLoaded', function () {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = forgotPasswordForm.querySelector('.login-btn');

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Form validation and submission
    forgotPasswordForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Clear previous messages
        hideError();
        hideSuccess();

        const email = emailInput.value.trim();

        // Validation
        if (!email) {
            showError('Please enter your email address');
            emailInput.focus();
            return;
        }

        if (!emailRegex.test(email)) {
            showError('Please enter a valid email address');
            emailInput.focus();
            return;
        }

        // Show loading state
        setLoading(true);

        // Simulate API call (Replace with actual password reset)
        try {
            await simulatePasswordReset(email);

            // Store reset request
            const resetData = {
                email,
                requestedAt: new Date().toISOString(),
                token: generateResetToken()
            };

            localStorage.setItem('passwordResetRequest', JSON.stringify(resetData));

            // Success
            emailInput.value = '';
            showSuccess(`Password reset link has been sent to ${email}. Please check your inbox.`);

            // Optionally redirect after some time
            setTimeout(() => {
                // Could redirect to login or stay on page
                // window.location.href = 'index.html';
            }, 5000);

            setLoading(false);

        } catch (error) {
            setLoading(false);
            showError(error.message);
        }
    });

    // Simulate password reset API call
    function simulatePasswordReset(email) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // In production, check if email exists in database
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const userExists = users.some(user => user.email === email);

                // For security, we should always show success message even if email doesn't exist
                // This prevents email enumeration attacks
                resolve({ success: true });

            }, 1500);
        });
    }

    // Generate a random reset token (for demo purposes)
    function generateResetToken() {
        return 'reset_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Helper functions
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');

        setTimeout(() => {
            hideError();
        }, 5000);
    }

    function hideError() {
        errorMessage.classList.remove('show');
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.add('show');
    }

    function hideSuccess() {
        successMessage.classList.remove('show');
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            emailInput.disabled = true;
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            emailInput.disabled = false;
        }
    }

    // Add input animations
    emailInput.addEventListener('focus', function () {
        this.parentElement.classList.add('focused');
    });

    emailInput.addEventListener('blur', function () {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });
});
