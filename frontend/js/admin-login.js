import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
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
                    // Success! Check session again to redirect
                     await checkSession();
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
            sessionStorage.setItem('post_login_redirect', 'admin');
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin, // Fallback safely to origin; global auth state will route
                    },
                });
                if (error) throw error;
            } catch (error) {
                showError(error.message);
            }
        });
    }


    // Initialize session check
    await checkSession();
});

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, we stay on the login page
    if (!session) return; 

    // If session exists, user is logged in. Check admin status.
    const user = session.user;
    
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
             await supabase.auth.signOut();
             setTimeout(() => {
                 window.location.href = 'user-login.html'; 
            }, 3000);
             return;
        }


        // Removed profile completion check. Admins don't need to fill details.
        
        // Admin is good to go
        window.location.href = 'admin-dashboard.html';

    } catch (error) {
        console.error('Error checking admin status:', error);
        showError('Error verifying admin privileges: ' + error.message);
        await supabase.auth.signOut();
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
