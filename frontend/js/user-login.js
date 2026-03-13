import { supabase } from './supabase.js';

// ============================================
// User Login & Profile Completion - JavaScript
// ============================================

function initializeAuth() {
    console.log("Initializing Auth Logic...");

    const googleLoginSection = document.getElementById('googleLoginSection');
    const profileCompletionSection = document.getElementById('profileCompletionSection');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');

    // ============================================
    // Check Auth Status & Profile
    // ============================================
    async function checkAuthStatus() {
        // Handle OAuth Redirect Errors
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        
        if (error) {
            console.error("Supabase OAuth Error:", error, errorDescription);
            setTimeout(() => {
                 showErrorAlert(decodeURIComponent(errorDescription || 'An error occurred during login.'));
            }, 500);
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            console.log("User session found:", session.user.id);
            
            // Check if profile exists and has required fields
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                    console.error("Profile fetch error:", error);
                    showErrorAlert("Error checking profile status.");
                    return;
                }

                // Check completeness: username, phone, address
                const isComplete = profile && 
                                   profile.username && profile.username.trim() !== '' &&
                                   profile.phone && profile.phone.trim() !== '' &&
                                   profile.address && profile.address.trim() !== '';

                if (isComplete) {
                    console.log("Profile is complete. Redirecting...");
                    window.location.href = '../index.html';
                } else {
                    console.log("Profile incomplete. Showing completion form.");
                    showProfileCompletionForm(session.user);
                }
            } catch (err) {
                console.error("Unexpected error checking profile:", err);
            }
        }
    }
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
             checkAuthStatus(); // Re-run check on sign-in
        }
    });

    // Run initial check
    checkAuthStatus();

    // ============================================
    // UI Helpers
    // ============================================
    function showProfileCompletionForm(user) {
        if(googleLoginSection) googleLoginSection.style.display = 'none';
        if(profileCompletionSection) profileCompletionSection.style.display = 'block';
        
        if(authTitle) authTitle.textContent = "Complete Your Profile";
        if(authSubtitle) authSubtitle.textContent = "We need a few more details to create your account";

        // Pre-fill email
        const emailInput = document.getElementById('profileEmail');
        if(emailInput) emailInput.value = user.email || '';
    }

    function showErrorAlert(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorAlertMessage');
        if (errorMessage) errorMessage.textContent = message;
        if (errorAlert) {
            errorAlert.style.display = 'block';
            errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setTimeout(() => { errorAlert.style.display = 'none'; }, 5000);
        }
    }

    // ============================================
    // Google Sign In
    // ============================================
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
             const redirectUrl = window.location.origin; // Use origin to avoid whitelist issues

             const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
             
             if (error) {
                 showErrorAlert('Failed to sign in with Google: ' + error.message);
             }
        });
    }

    // ============================================
    // Profile Completion Form Submission
    // ============================================
    const profileForm = document.getElementById('profileCompletionForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('profileName').value.trim();
            const phone = document.getElementById('profilePhone').value.trim();
            const address = document.getElementById('profileAddress').value.trim();
            
            // Validation
            if (username.length < 2) {
                showFieldError('profileName', 'profileNameError', 'Name must be at least 2 characters');
                return;
            } else {
                clearFieldError('profileName', 'profileNameError');
            }

            if (phone.length < 10) { // Basic length check check
                showFieldError('profilePhone', 'profilePhoneError', 'Please enter a valid phone number');
                return;
            } else {
                clearFieldError('profilePhone', 'profilePhoneError');
            }

            if (address.length < 5) {
                showFieldError('profileAddress', 'profileAddressError', 'Please enter a valid address');
                return;
            } else {
                clearFieldError('profileAddress', 'profileAddressError');
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    showErrorAlert("Session expired. Please sign in again.");
                    setTimeout(() => window.location.reload(), 2000);
                    return;
                }

                const updates = {
                    id: session.user.id,
                    email: session.user.email,
                    username: username,
                    phone: phone,
                    address: address
                    // updated_at removed as it doesn't exist in the table
                };

                console.log("Attempting profile update:", updates);

                const { error } = await supabase.from('profiles').upsert(updates).select();

                if (error) {
                    console.error("Supabase Upsert Error:", error);
                    throw error;
                }

                // Success
                window.location.href = '../index.html';

            } catch (err) {
                console.error("Profile update error details:", err);
                const msg = err.message || "Unknown error";
                const hint = err.hint || "";
                const details = err.details || "";
                showErrorAlert(`Failed to save profile: ${msg} ${hint} ${details}`);
            }
        });
    }

    // ============================================
    // Validation Helpers
    // ============================================
    function showFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(errorId);
        if(field) {
            field.classList.add('error');
            field.classList.remove('success');
        }
        if(errorElement) errorElement.textContent = message;
    }

    function clearFieldError(fieldId, errorId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(errorId);
        if(field) {
            field.classList.remove('error');
            field.classList.remove('success');
        }
        if(errorElement) errorElement.textContent = '';
    }
}

// Global scope for closing alert
window.closeAlert = function(alertId) {
    const el = document.getElementById(alertId);
    if(el) el.style.display = 'none';
};

initializeAuth();
