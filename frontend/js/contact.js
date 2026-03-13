// Contact Form JavaScript

// Initialize contact form
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
        
        // Add real-time validation
        const formInputs = contactForm.querySelectorAll('.form-input');
        formInputs.forEach(function(input) {
            input.addEventListener('blur', function() {
                validateField(input);
            });
            
            input.addEventListener('input', function() {
                if (input.classList.contains('error')) {
                    validateField(input);
                }
            });
        });
    }
});

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Clear previous alerts
    clearAlerts();
    
    // Validate all fields
    const isValid = validateForm();
    
    if (isValid) {
        // Get form data
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Show loading state
        const submitBtn = e.target.querySelector('.contact-submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<svg class="btn-icon spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Sending...';
        
        // Simulate form submission (replace with actual API call)
        setTimeout(function() {
            // Randomly simulate success or failure for demo
            const isSuccess = Math.random() > 0.2; // 80% success rate
            
            if (isSuccess) {
                showAlert('success', 'Message Sent Successfully!', 'Thank you for contacting us. We will get back to you within 24 hours.');
                e.target.reset();
            } else {
                showAlert('error', 'Failed to Send Message', 'There was an error sending your message. Please try again later.');
            }
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            
            // Scroll to alert
            document.getElementById('alert-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 1500);
    } else {
        showAlert('error', 'Validation Error', 'Please correct the errors in the form before submitting.');
        
        // Scroll to first error
        const firstError = document.querySelector('.form-input.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
    }
}

// Validate entire form
function validateForm() {
    const form = document.getElementById('contact-form');
    const inputs = form.querySelectorAll('.form-input');
    let isValid = true;
    
    inputs.forEach(function(input) {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Validate individual field
function validateField(input) {
    const value = input.value.trim();
    const name = input.name;
    const errorElement = document.getElementById(name + '-error');
    
    // Clear previous error
    input.classList.remove('error');
    errorElement.textContent = '';
    errorElement.classList.remove('visible');
    
    // Validation rules
    if (input.hasAttribute('required') && value === '') {
        showFieldError(input, errorElement, 'This field is required');
        return false;
    }
    
    if (name === 'name' && value.length > 0 && value.length < 2) {
        showFieldError(input, errorElement, 'Name must be at least 2 characters');
        return false;
    }
    
    if (name === 'email' && value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(input, errorElement, 'Please enter a valid email address');
            return false;
        }
    }
    
    if (name === 'phone' && value.length > 0) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(value) || value.length < 10) {
            showFieldError(input, errorElement, 'Please enter a valid phone number');
            return false;
        }
    }
    
    if (name === 'message' && value.length > 0 && value.length < 10) {
        showFieldError(input, errorElement, 'Message must be at least 10 characters');
        return false;
    }
    
    return true;
}

// Show field error
function showFieldError(input, errorElement, message) {
    input.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('visible');
}

// Show alert message
function showAlert(type, title, message) {
    const alertContainer = document.getElementById('alert-container');
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    const iconSVG = type === 'success' 
        ? '<svg class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    alertDiv.innerHTML = `
        ${iconSVG}
        <div class="alert-content">
            <div class="alert-title">${title}</div>
            <p class="alert-message">${message}</p>
        </div>
        <button class="alert-close" aria-label="Close alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Add close button functionality
    const closeBtn = alertDiv.querySelector('.alert-close');
    closeBtn.addEventListener('click', function() {
        removeAlert(alertDiv);
    });
    
    // Auto-remove after 8 seconds
    setTimeout(function() {
        removeAlert(alertDiv);
    }, 8000);
}

// Remove alert
function removeAlert(alertDiv) {
    if (alertDiv && alertDiv.parentElement) {
        alertDiv.classList.add('hiding');
        setTimeout(function() {
            alertDiv.remove();
        }, 300);
    }
}

// Clear all alerts
function clearAlerts() {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = '';
}

// Add spinning animation for loading state
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    
    .spinning {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);
