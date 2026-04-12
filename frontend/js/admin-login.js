import { supabase } from './supabase.js';

const ADMIN_SESSION_KEY = '_admin_session';

function clearAdminSession() {
    try {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (error) {
        console.warn('Failed to clear admin session:', error);
    }
}

function storeAdminSession(session) {
    try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
        console.warn('Failed to store admin session:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    clearAdminSession();
    // Show admin content by default
    const accessDenied = document.getElementById('accessDenied');
    const adminContent = document.getElementById('adminContent');
    if (accessDenied) accessDenied.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';

    const googleBtn = document.getElementById('googleSignInBtn');

    // Handle Email Login
    const emailForm = document.getElementById('adminEmailLoginForm');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;    
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) errorDiv.textContent = '';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    throw error;
                } else {
                    // Success! Validate admin role and store admin session
                    await checkSession(data?.session || null);
                }

            } catch (err) {
               console.error('Login error:', err);
               if (errorDiv) errorDiv.textContent = 'Invalid login credentials.';
            }
        });
    }

    // Handle Google Login
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            // post_login_redirect completely absent in admin flows.
            try {
                const redirectTo = `${window.location.origin}/pages/admin-login.html`;
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo,
                    },
                });
                if (error) throw error;
            } catch (error) {
                showError(error.message);
            }
        });
    }

    // Initialize session check only for OAuth callbacks
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCode = urlParams.has('code');
    const hasOAuthToken = window.location.hash.includes('access_token');
    if (hasOAuthCode || hasOAuthToken) {
        await checkSession();
    }
});

async function checkSession(sessionOverride = null) {
    const resolvedSession = sessionOverride || (await supabase.auth.getSession()).data?.session;

    // If no session, we stay on the login page
    if (!resolvedSession) return;

    // If session exists, user is logged in. Check admin status.
    const user = resolvedSession.user;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // If no profile or error, user is not authorized as admin
        if (error || !profile || !profile.is_admin) {
            console.error('Profile fetch error or not admin:', error);
            showError('Access Denied: You do not have administrator privileges.');
            clearAdminSession();
            return;
        }

        // Admin is good to go
        storeAdminSession(resolvedSession);
        
        // Final explicit requested cleanup before directing to dashboard
        sessionStorage.removeItem('post_login_redirect');
        
        window.location.href = 'admin-dashboard.html';

    } catch (error) {
        console.error('Error checking admin status:', error);
        showError('Error verifying admin privileges: ' + error.message);
        clearAdminSession();
    }
}

function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    const msgSpan = document.getElementById('errorAlertMessage');

    if (errorAlert && msgSpan) {
        msgSpan.textContent = message;
        errorAlert.style.display = 'flex';
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}
