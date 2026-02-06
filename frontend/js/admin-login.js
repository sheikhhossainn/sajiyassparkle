// ============================================
// SECURITY: Secret URL Access Control
// Access this page via: admin-login.html#-Sa7iyA
// ============================================

const SECRET_KEY = '-Sa7iyA';

function initializeToggleFunctionality() {
    console.log('Initializing toggle functionality...');

    // Get DOM elements
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    // Check if elements exist
    if (!loginToggle || !registerToggle || !loginForm || !registerForm) {
        console.error('Required elements not found, retrying...');
        setTimeout(initializeToggleFunctionality, 100);
        return;
    }

    console.log('All elements found successfully');

    // Toggle to login form
    function showLoginForm() {
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        console.log('Switched to login form');
    }

    // Toggle to register form
    function showRegisterForm() {
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        console.log('Switched to register form');
    }

    // Event listeners for toggle buttons
    loginToggle.addEventListener('click', function() {
        console.log('Login toggle clicked');
        showLoginForm();
    });
    
    registerToggle.addEventListener('click', function() {
        console.log('Register toggle clicked');
        showRegisterForm();
    });
    
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Switch to register link clicked');
            showRegisterForm();
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Switch to login link clicked');
            showLoginForm();
        });
    }

    console.log('Event listeners attached successfully');
}

function checkAccess() {
    const hash = window.location.hash;
    const accessDenied = document.getElementById('accessDenied');
    const adminContent = document.getElementById('adminContent');
    
    if (!accessDenied || !adminContent) {
        // Elements not ready yet, try again shortly
        setTimeout(checkAccess, 50);
        return;
    }
    
    if (hash === '#' + SECRET_KEY) {
        // Grant access
        accessDenied.style.display = 'none';
        adminContent.style.display = 'block';
        console.log('Access granted');
        
        // Initialize toggle functionality after access is granted
        setTimeout(initializeToggleFunctionality, 50);
        return true;
    } else {
        // Deny access
        accessDenied.style.display = 'block';
        adminContent.style.display = 'none';
        console.log('Access denied');
        return false;
    }
}

// Check access immediately and on DOM ready
checkAccess();
document.addEventListener('DOMContentLoaded', checkAccess);

// Monitor hash changes (in case someone tries to modify the URL)
window.addEventListener('hashchange', checkAccess);

// ============================================
// Form Validation and Password Toggle
// (These are initialized with the main toggle functionality)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if access is granted
    if (window.location.hash !== '#-Sa7iyA') {
        return;
    }

    // Wait a bit to ensure elements are visible
    setTimeout(function() {

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
    // Form Validation
    // ============================================

    // Login form validation
    const loginFormElement = document.getElementById('loginFormElement');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors('login');
            
            // Get form values
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            
            let isValid = true;
            
            // Validate email
            if (!email) {
                showError('loginEmailError', 'Email is required');
                isValid = false;
            } else if (!isValidEmail(email)) {
                showError('loginEmailError', 'Please enter a valid email');
                isValid = false;
            }
            
            // Validate password
            if (!password) {
                showError('loginPasswordError', 'Password is required');
                isValid = false;
            }
            
            if (isValid) {
                // Here you would typically send the data to a server
                console.log('Login form submitted:', { email, password });
                // Redirect to admin dashboard
                window.location.href = 'admin-dashboard.html';
            }
        });
    }

    // Register form validation
    const registerFormElement = document.getElementById('registerFormElement');
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors('register');
            
            // Get form values
            const firstName = document.getElementById('registerFirstName').value.trim();
            const lastName = document.getElementById('registerLastName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value.trim();
            const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();
            const role = document.getElementById('registerRole').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            let isValid = true;
            
            // Validate first name
            if (!firstName) {
                showError('registerFirstNameError', 'First name is required');
                isValid = false;
            }
            
            // Validate last name
            if (!lastName) {
                showError('registerLastNameError', 'Last name is required');
                isValid = false;
            }
            
            // Validate email
            if (!email) {
                showError('registerEmailError', 'Email is required');
                isValid = false;
            } else if (!isValidEmail(email)) {
                showError('registerEmailError', 'Please enter a valid email');
                isValid = false;
            }
            
            // Validate password
            if (!password) {
                showError('registerPasswordError', 'Password is required');
                isValid = false;
            } else if (password.length < 8) {
                showError('registerPasswordError', 'Password must be at least 8 characters');
                isValid = false;
            }
            
            // Validate confirm password
            if (!confirmPassword) {
                showError('registerConfirmPasswordError', 'Please confirm your password');
                isValid = false;
            } else if (password !== confirmPassword) {
                showError('registerConfirmPasswordError', 'Passwords do not match');
                isValid = false;
            }
            
            // Validate role
            if (!role) {
                showError('registerRoleError', 'Please select a role');
                isValid = false;
            }
            
            // Validate terms agreement
            if (!agreeTerms) {
                alert('Please agree to the Terms & Conditions');
                isValid = false;
            }
            
            if (isValid) {
                // Here you would typically send the data to a server
                console.log('Register form submitted:', {
                    firstName,
                    lastName,
                    email,
                    password,
                    role
                });
                // Redirect to admin dashboard
                window.location.href = 'admin-dashboard.html';
            }
        });
    }

    // ============================================
    // Helper Functions
    // ============================================

    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            const inputElement = errorElement.previousElementSibling;
            // Check if previous element is password-wrapper
            if (inputElement && inputElement.classList.contains('password-wrapper')) {
                const actualInput = inputElement.querySelector('.form-input');
                if (actualInput) {
                    actualInput.classList.add('error');
                }
            } else if (inputElement && inputElement.classList.contains('form-input')) {
                inputElement.classList.add('error');
            }
        }
    }

    function clearErrors(formType) {
        const errors = document.querySelectorAll('.form-error');
        errors.forEach(error => {
            error.textContent = '';
        });
        
        const inputs = document.querySelectorAll('.form-input.error');
        inputs.forEach(input => {
            input.classList.remove('error');
        });
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ============================================
    // Real-time validation
    // ============================================

    // Clear error on input
    const allInputs = document.querySelectorAll('.form-input');
    allInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('error');
            const parentWrapper = this.parentElement;
            let errorElement;
            
            if (parentWrapper.classList.contains('password-wrapper')) {
                errorElement = parentWrapper.nextElementSibling;
            } else {
                errorElement = this.nextElementSibling;
            }
            
            if (errorElement && errorElement.classList.contains('form-error')) {
                errorElement.textContent = '';
            }
        });
    });
    }, 200); // Close setTimeout
});
