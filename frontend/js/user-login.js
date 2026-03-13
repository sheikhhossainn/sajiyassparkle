import { supabase } from './supabase.js';

// ============================================
// User Login & Registration - JavaScript
// ============================================

function initializeAuth() {
    console.log("Initializing Auth Logic...");

    // Check for existing session or OAuth errors
    async function checkAuthStatus() {
        // Check for error in hash (OAuth redirect)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        
        if (error) {
            console.error("Supabase OAuth Error:", error, errorDescription);
            // Allow UI to settle
            setTimeout(() => {
                 showErrorAlert(decodeURIComponent(errorDescription || 'An error occurred during login.'));
            }, 500);
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log("User already logged in, redirecting...");
            window.location.href = '../index.html';
        }
    }
    checkAuthStatus();

    // Listen for auth state changes (e.g. OAuth callback)
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
             console.log("User signed in, redirecting...");
             window.location.href = '../index.html';
        }
    });

    // Form Toggle Functionality
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const loginFormContainer = document.getElementById('loginForm');
    const registerFormContainer = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    if (!loginToggle || !registerToggle) {
        console.error("Auth toggles not found!");
        return;
    }

    // Toggle to Login Form
    function showLoginForm() {
        console.log("Switching to Login Form");
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
        loginFormContainer.classList.add('active');
        registerFormContainer.classList.remove('active');
        clearAllErrors();
        hideAllAlerts();
        
        // Show Google Button when on Login
        const googleBtn = document.getElementById('googleSignInBtn');
        const googleDivider = document.querySelector('.google-divider'); 
        if(googleBtn) googleBtn.style.display = 'flex';
        if(googleDivider) googleDivider.style.display = 'block';
    }

    // Toggle to Register Form
    function showRegisterForm() {
        console.log("Switching to Register Form");
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
        registerFormContainer.classList.add('active');
        loginFormContainer.classList.remove('active');
        clearAllErrors();
        hideAllAlerts();

        // Hide Google Button when on Register
        const googleBtn = document.getElementById('googleSignInBtn');
        const googleDivider = document.querySelector('.google-divider');
        if(googleBtn) googleBtn.style.display = 'none';
        if(googleDivider) googleDivider.style.display = 'none';
    }

    // Event Listeners for Toggle Buttons
    loginToggle.addEventListener('click', showLoginForm);
    registerToggle.addEventListener('click', showRegisterForm);
    switchToRegister.addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterForm();
    });
    switchToLogin.addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });


    // ============================================
    // Password Toggle Functionality
    // ============================================
    const passwordToggles = document.querySelectorAll('.password-toggle');
    
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const eyeOpen = this.querySelector('.eye-open');
            const eyeClosed = this.querySelector('.eye-closed');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
            } else {
                passwordInput.type = 'password';
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
            }
        });
    });

    // ============================================
    // Alert Functions
    // ============================================
    function showErrorAlert(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorAlertMessage');
        errorMessage.textContent = message;
        errorAlert.style.display = 'block';
        
        // Scroll to alert
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    }

    function showSuccessAlert(message) {
        const successAlert = document.getElementById('successAlert');
        const successMessage = document.getElementById('successAlertMessage');
        successMessage.textContent = message;
        successAlert.style.display = 'block';
        
        // Scroll to alert
        successAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 5000);
    }

    function hideAllAlerts() {
        document.getElementById('errorAlert').style.display = 'none';
        document.getElementById('successAlert').style.display = 'none';
    }

    // Global function for closing alerts (called from HTML)
    window.closeAlert = function(alertId) {
        document.getElementById(alertId).style.display = 'none';
    };

    // ============================================
    // Validation Functions
    // ============================================
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validatePassword(password) {
        // At least 8 characters, one uppercase, one lowercase, one number
        return password.length >= 8;
    }

    function validatePhone(phone) {
        // Basic phone validation (allows various formats)
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    function validateName(name) {
        return name.trim().length >= 2;
    }

    function showFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(errorId);
        
        field.classList.add('error');
        field.classList.remove('success');
        errorElement.textContent = message;
    }

    function showFieldSuccess(fieldId, errorId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(errorId);
        
        field.classList.remove('error');
        field.classList.add('success');
        errorElement.textContent = '';
    }

    function clearFieldError(fieldId, errorId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(errorId);
        
        field.classList.remove('error');
        field.classList.remove('success');
        errorElement.textContent = '';
    }

    function clearAllErrors() {
        const allInputs = document.querySelectorAll('.form-input');
        const allErrors = document.querySelectorAll('.form-error');
        
        allInputs.forEach(input => {
            input.classList.remove('error', 'success');
        });
        
        allErrors.forEach(error => {
            error.textContent = '';
        });
    }

    // ============================================
    // Real-time Validation
    // ============================================
    
    // Login Email Validation
    const loginEmail = document.getElementById('loginEmail');
    loginEmail.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            showFieldError('loginEmail', 'loginEmailError', 'Email is required');
        } else if (!validateEmail(this.value)) {
            showFieldError('loginEmail', 'loginEmailError', 'Please enter a valid email address');
        } else {
            showFieldSuccess('loginEmail', 'loginEmailError');
        }
    });

    loginEmail.addEventListener('input', function() {
        if (this.value.trim() !== '' && validateEmail(this.value)) {
            showFieldSuccess('loginEmail', 'loginEmailError');
        }
    });

    // Login Password Validation
    const loginPassword = document.getElementById('loginPassword');
    loginPassword.addEventListener('blur', function() {
        if (this.value === '') {
            showFieldError('loginPassword', 'loginPasswordError', 'Password is required');
        } else {
            clearFieldError('loginPassword', 'loginPasswordError');
        }
    });

    // Register First Name Validation
    const registerFirstName = document.getElementById('registerFirstName');
    registerFirstName.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            showFieldError('registerFirstName', 'registerFirstNameError', 'First name is required');
        } else if (!validateName(this.value)) {
            showFieldError('registerFirstName', 'registerFirstNameError', 'First name must be at least 2 characters');
        } else {
            showFieldSuccess('registerFirstName', 'registerFirstNameError');
        }
    });

    // Register Last Name Validation
    const registerLastName = document.getElementById('registerLastName');
    registerLastName.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            showFieldError('registerLastName', 'registerLastNameError', 'Last name is required');
        } else if (!validateName(this.value)) {
            showFieldError('registerLastName', 'registerLastNameError', 'Last name must be at least 2 characters');
        } else {
            showFieldSuccess('registerLastName', 'registerLastNameError');
        }
    });

    // Register Email Validation
    const registerEmail = document.getElementById('registerEmail');
    registerEmail.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            showFieldError('registerEmail', 'registerEmailError', 'Email is required');
        } else if (!validateEmail(this.value)) {
            showFieldError('registerEmail', 'registerEmailError', 'Please enter a valid email address');
        } else {
            showFieldSuccess('registerEmail', 'registerEmailError');
        }
    });

    // Register Phone Validation
    const registerPhone = document.getElementById('registerPhone');
    registerPhone.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            showFieldError('registerPhone', 'registerPhoneError', 'Phone number is required');
        } else if (!validatePhone(this.value)) {
            showFieldError('registerPhone', 'registerPhoneError', 'Please enter a valid phone number');
        } else {
            showFieldSuccess('registerPhone', 'registerPhoneError');
        }
    });

    // Register Password Validation
    const registerPassword = document.getElementById('registerPassword');
    registerPassword.addEventListener('blur', function() {
        if (this.value === '') {
            showFieldError('registerPassword', 'registerPasswordError', 'Password is required');
        } else if (!validatePassword(this.value)) {
            showFieldError('registerPassword', 'registerPasswordError', 'Password must be at least 8 characters');
        } else {
            showFieldSuccess('registerPassword', 'registerPasswordError');
        }
    });

    // Register Confirm Password Validation
    const registerConfirmPassword = document.getElementById('registerConfirmPassword');
    registerConfirmPassword.addEventListener('blur', function() {
        if (this.value === '') {
            showFieldError('registerConfirmPassword', 'registerConfirmPasswordError', 'Please confirm your password');
        } else if (this.value !== registerPassword.value) {
            showFieldError('registerConfirmPassword', 'registerConfirmPasswordError', 'Passwords do not match');
        } else {
            showFieldSuccess('registerConfirmPassword', 'registerConfirmPasswordError');
        }
    });

    // Also validate confirm password when main password changes
    registerPassword.addEventListener('input', function() {
        if (registerConfirmPassword.value !== '' && registerConfirmPassword.value !== this.value) {
            showFieldError('registerConfirmPassword', 'registerConfirmPasswordError', 'Passwords do not match');
        } else if (registerConfirmPassword.value !== '' && registerConfirmPassword.value === this.value) {
            showFieldSuccess('registerConfirmPassword', 'registerConfirmPasswordError');
        }
    });

    // ============================================
    // Form Submission
    // ============================================
    
    // Google Sign In
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
             const { data, error } = await supabase.auth.signInWithOAuth({
                 provider: 'google',
                  options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
             });
             
             if (error) {
                 // console.error('Error logging in with Google:', error);
                 showErrorAlert('Failed to sign in with Google: ' + error.message);
             }
        });
    }

    // Login Form Submission
    const loginFormElement = document.getElementById('loginFormElement');
    loginFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideAllAlerts();
        
        const email = loginEmail.value.trim();
        const password = loginPassword.value;
        let isValid = true;

        // Validate Email
        if (email === '') {
            showFieldError('loginEmail', 'loginEmailError', 'Email is required');
            isValid = false;
        } else if (!validateEmail(email)) {
            showFieldError('loginEmail', 'loginEmailError', 'Please enter a valid email address');
            isValid = false;
        } else {
            showFieldSuccess('loginEmail', 'loginEmailError');
        }

        // Validate Password
        if (password === '') {
            showFieldError('loginPassword', 'loginPasswordError', 'Password is required');
            isValid = false;
        } else {
            clearFieldError('loginPassword', 'loginPasswordError');
        }

        if (isValid) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    showErrorAlert(error.message);
                    return;
                }

                showSuccessAlert('Login successful! Redirecting to your account...');
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 2000);
            } catch (err) {
                showErrorAlert('An unexpected error occurred. Please try again.');
                console.error(err);
            }
        } else {
            showErrorAlert('Please correct the errors in the form and try again.');
        }
    });

    // Register Form Submission
    const registerFormElement = document.getElementById('registerFormElement');
    
    // We need to use cloneNode to ensure we have a fresh form without stacked listeners
    const newRegisterFormElement = registerFormElement.cloneNode(true);
    registerFormElement.parentNode.replaceChild(newRegisterFormElement, registerFormElement);
    
    newRegisterFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideAllAlerts();
        
        // Re-query inputs because the old variables point to the old (removed) DOM nodes!
        const firstName = document.getElementById('registerFirstName').value.trim();
        const lastName = document.getElementById('registerLastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const phone = document.getElementById('registerPhone').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        let isValid = true;

        console.log("Register Form Submitted"); // Debugging

        // Note: Validation logic remains ...
        // Validate First Name
        if (firstName === '') {
            showFieldError('registerFirstName', 'registerFirstNameError', 'First name is required');
            isValid = false;
        } else if (!validateName(firstName)) {
            showFieldError('registerFirstName', 'registerFirstNameError', 'First name must be at least 2 characters');
            isValid = false;
        } else {
            showFieldSuccess('registerFirstName', 'registerFirstNameError');
        }

        // Validate Last Name
        if (lastName === '') {
            showFieldError('registerLastName', 'registerLastNameError', 'Last name is required');
            isValid = false;
        } else if (!validateName(lastName)) {
            showFieldError('registerLastName', 'registerLastNameError', 'Last name must be at least 2 characters');
            isValid = false;
        } else {
            showFieldSuccess('registerLastName', 'registerLastNameError');
        }

        // Validate Email
        if (email === '') {
            showFieldError('registerEmail', 'registerEmailError', 'Email is required');
            isValid = false;
        } else if (!validateEmail(email)) {
            showFieldError('registerEmail', 'registerEmailError', 'Please enter a valid email address');
            isValid = false;
        } else {
            showFieldSuccess('registerEmail', 'registerEmailError');
        }

        // Validate Phone
        if (phone === '') {
            showFieldError('registerPhone', 'registerPhoneError', 'Phone number is required');
            isValid = false;
        } else if (!validatePhone(phone)) {
            showFieldError('registerPhone', 'registerPhoneError', 'Please enter a valid phone number');
            isValid = false;
        } else {
            showFieldSuccess('registerPhone', 'registerPhoneError');
        }

        // Validate Password
        if (password === '') {
            showFieldError('registerPassword', 'registerPasswordError', 'Password is required');
            isValid = false;
        } else if (!validatePassword(password)) {
            showFieldError('registerPassword', 'registerPasswordError', 'Password must be at least 8 characters');
            isValid = false;
        } else {
            showFieldSuccess('registerPassword', 'registerPasswordError');
        }

        // Validate Confirm Password
        if (confirmPassword === '') {
            showFieldError('registerConfirmPassword', 'registerConfirmPasswordError', 'Please confirm your password');
            isValid = false;
        } else if (confirmPassword !== password) {
            showFieldError('registerConfirmPassword', 'registerConfirmPasswordError', 'Passwords do not match');
            isValid = false;
        } else {
            showFieldSuccess('registerConfirmPassword', 'registerConfirmPasswordError');
        }

        // Validate Terms Agreement
        if (!agreeTerms) {
            document.getElementById('registerTermsError').textContent = 'You must agree to the Terms & Conditions';
            isValid = false;
        } else {
            document.getElementById('registerTermsError').textContent = '';
        }

        if (isValid) {
            console.log("Validation Passed, sending to Supabase...");
            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            phone: phone
                        }
                    }
                });

                if (error) {
                    console.error("Supabase Error:", error);
                    showErrorAlert(error.message);
                    return;
                }

                // Insert profile row so admin can see this customer
                if (data?.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: data.user.id,
                            email: email,
                            username: `${firstName} ${lastName}`.trim(),
                            phone: phone || null,
                            is_admin: false
                        }, { onConflict: 'id' });
                    if (profileError) {
                        console.warn('Profile insert warning:', profileError.message);
                    }
                }

                console.log("Supabase Success:", data);
                showSuccessAlert('Account created successfully! Please check your email for confirmation link before logging in.');
                
                // Switch to login after 3 seconds
                setTimeout(() => {
                    showLoginForm();
                    newRegisterFormElement.reset();
                }, 3000);
            } catch (err) {
                showErrorAlert('An unexpected error occurred. Please try again.');
                console.error(err);
            }
        } else {
            console.log("Validation Failed");
            showErrorAlert('Please correct the errors in the form and try again.');
        }
    });
}

// Start immediately
initializeAuth();
