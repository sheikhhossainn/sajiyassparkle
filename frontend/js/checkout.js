// ============================================
// Checkout Form Validation & Submission
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('checkoutForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    // Form field validation rules
    const validationRules = {
        fullName: {
            required: true,
            minLength: 2,
            pattern: /^[a-zA-Z\s]+$/,
            errorMessage: 'Please enter a valid full name'
        },
        email: {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            errorMessage: 'Please enter a valid email address'
        },
        phone: {
            required: true,
            pattern: /^[\d\s\(\)\-\+]+$/,
            minLength: 10,
            errorMessage: 'Please enter a valid phone number'
        },
        address: {
            required: true,
            minLength: 5,
            errorMessage: 'Please enter a valid street address'
        },
        city: {
            required: true,
            minLength: 2,
            pattern: /^[a-zA-Z\s]+$/,
            errorMessage: 'Please enter a valid city name'
        },
        state: {
            required: true,
            minLength: 2,
            errorMessage: 'Please enter a valid state'
        },
        zipCode: {
            required: true,
            pattern: /^\d{5}(-\d{4})?$/,
            errorMessage: 'Please enter a valid zip code (e.g., 10001)'
        }
    };

    // Validate individual field
    function validateField(fieldName, value) {
        const rules = validationRules[fieldName];
        if (!rules) return { valid: true };

        // Check if required
        if (rules.required && !value.trim()) {
            return {
                valid: false,
                message: 'This field is required'
            };
        }

        // Check minimum length
        if (rules.minLength && value.trim().length < rules.minLength) {
            return {
                valid: false,
                message: `Must be at least ${rules.minLength} characters`
            };
        }

        // Check pattern
        if (rules.pattern && value.trim() && !rules.pattern.test(value.trim())) {
            return {
                valid: false,
                message: rules.errorMessage
            };
        }

        return { valid: true };
    }

    // Display field error
    function showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(`${fieldName}Error`);
        
        if (field && errorElement) {
            field.classList.add('error');
            errorElement.textContent = message;
        }
    }

    // Clear field error
    function clearFieldError(fieldName) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(`${fieldName}Error`);
        
        if (field && errorElement) {
            field.classList.remove('error');
            errorElement.textContent = '';
        }
    }

    // Add real-time validation on blur
    Object.keys(validationRules).forEach(fieldName => {
        const field = document.getElementById(fieldName);
        if (field) {
            field.addEventListener('blur', function() {
                const validation = validateField(fieldName, this.value);
                if (!validation.valid) {
                    showFieldError(fieldName, validation.message);
                } else {
                    clearFieldError(fieldName);
                }
            });

            // Clear error on input
            field.addEventListener('input', function() {
                if (field.classList.contains('error')) {
                    clearFieldError(fieldName);
                }
            });
        }
    });

    // Show error alert
    function showErrorAlert(message) {
        errorMessage.textContent = message;
        errorAlert.style.display = 'flex';
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Close error alert
    window.closeAlert = function() {
        errorAlert.style.display = 'none';
    };

    // Set loading state
    function setLoadingState(isLoading) {
        if (isLoading) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Hide any existing errors
        errorAlert.style.display = 'none';

        // Validate all fields
        let isValid = true;
        const formData = {};

        Object.keys(validationRules).forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                const value = field.value;
                const validation = validateField(fieldName, value);
                
                if (!validation.valid) {
                    showFieldError(fieldName, validation.message);
                    isValid = false;
                } else {
                    clearFieldError(fieldName);
                    formData[fieldName] = value.trim();
                }
            }
        });

        // Add optional fields
        const address2 = document.getElementById('address2');
        const notes = document.getElementById('notes');
        if (address2) formData.address2 = address2.value.trim();
        if (notes) formData.notes = notes.value.trim();

        if (!isValid) {
            showErrorAlert('Please correct the errors in the form before submitting.');
            return;
        }

        // Set loading state
        setLoadingState(true);

        // Simulate API call
        try {
            await simulateOrderSubmission(formData);
            
            // Success - redirect or show success message
            alert('Order placed successfully! Thank you for your purchase.');
            form.reset();
            
        } catch (error) {
            // Show error
            showErrorAlert(error.message || 'Failed to process your order. Please try again.');
        } finally {
            setLoadingState(false);
        }
    });

    // Simulate order submission (replace with actual API call)
    function simulateOrderSubmission(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random success/failure for demo purposes
                const success = Math.random() > 0.2; // 80% success rate
                
                if (success) {
                    console.log('Order submitted:', data);
                    resolve({ orderId: 'ORD-' + Date.now() });
                } else {
                    reject(new Error('Payment processing failed. Please check your payment method and try again.'));
                }
            }, 2000); // 2 second delay to simulate network request
        });
    }
});
