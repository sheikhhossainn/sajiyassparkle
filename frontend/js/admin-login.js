import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    showAdminContent();
    setupAuthToggle();
    setupPasswordToggles();
    setupLogin();
    setupRegister();
    setupGoogleLogin();
    checkExistingSession();
});

function showAdminContent() {
    const accessDenied = document.getElementById('accessDenied');
    const adminContent = document.getElementById('adminContent');

    if (accessDenied) accessDenied.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';
}

function setupAuthToggle() {
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    const showLoginForm = () => {
        if (loginToggle) loginToggle.classList.add('active');
        if (registerToggle) registerToggle.classList.remove('active');
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
    };

    const showRegisterForm = () => {
        if (registerToggle) registerToggle.classList.add('active');
        if (loginToggle) loginToggle.classList.remove('active');
        if (registerForm) registerForm.classList.add('active');
        if (loginForm) loginForm.classList.remove('active');
    };

    if (loginToggle) loginToggle.addEventListener('click', showLoginForm);
    if (registerToggle) registerToggle.addEventListener('click', showRegisterForm);

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterForm();
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }
}

function setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');

    passwordToggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target');
            const input = document.getElementById(targetId || '');
            if (!input) return;

            const eyeOpen = toggle.querySelector('.eye-open');
            const eyeClosed = toggle.querySelector('.eye-closed');

            if (input.type === 'password') {
                input.type = 'text';
                if (eyeOpen) eyeOpen.style.display = 'none';
                if (eyeClosed) eyeClosed.style.display = 'block';
            } else {
                input.type = 'password';
                if (eyeOpen) eyeOpen.style.display = 'block';
                if (eyeClosed) eyeClosed.style.display = 'none';
            }
        });
    });
}

function setupLogin() {
    const loginForm = document.getElementById('loginFormElement');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail')?.value.trim() || '';
        const password = document.getElementById('loginPassword')?.value || '';

        if (!email || !password) {
            alert('Email and password are required.');
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert('Login failed: ' + error.message);
            return;
        }

        await redirectIfAdmin(data.user?.id || '');
    });
}

function setupRegister() {
    const registerForm = document.getElementById('registerFormElement');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('registerFirstName')?.value.trim() || '';
        const lastName = document.getElementById('registerLastName')?.value.trim() || '';
        const email = document.getElementById('registerEmail')?.value.trim() || '';
        const password = document.getElementById('registerPassword')?.value || '';
        const confirmPassword = document.getElementById('registerConfirmPassword')?.value || '';
        const agreeTerms = document.getElementById('agreeTerms')?.checked;

        if (!firstName || !lastName || !email || !password) {
            alert('Please fill in all required fields.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        if (!agreeTerms) {
            alert('Please agree to the Terms & Conditions.');
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`
                }
            }
        });

        if (error) {
            alert('Registration failed: ' + error.message);
            return;
        }

        alert('Account created. Ask an existing admin to set your profiles.is_admin = true.');
    });
}

function setupGoogleLogin() {
    const googleBtn = document.getElementById('adminGoogleSignInBtn');
    if (!googleBtn) return;

    googleBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google'
        });

        if (error) {
            alert('Google sign-in failed: ' + error.message);
        }
    });
}

async function checkExistingSession() {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;

    await redirectIfAdmin(userId);
}

async function redirectIfAdmin(userId) {
    if (!userId) return;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

    if (error || !profile?.is_admin) {
        alert('Access denied. This account is not an admin.');
        await supabase.auth.signOut();
        return;
    }

    window.location.href = 'admin-products.html';
}
