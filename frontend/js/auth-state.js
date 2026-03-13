// common/auth-state.js or similar
import { supabase } from './supabase.js';

// Global error handler for OAuth redirects
function handleAuthErrors() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
        console.error('Supabase Auth Error:', error, errorDescription);
        // Use a simple alert for now, or a custom UI if available
        alert(`Authentication Error: ${decodeURIComponent(errorDescription || error)}`);
        // Clean up the URL
        history.replaceState(null, '', ' ');
    }
}


async function updateAuthUI() {
    handleAuthErrors();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if we are already on a login page
    const currentPath = window.location.pathname.toLowerCase();
    const isLoginPage = currentPath.includes('user-login.html') || currentPath.includes('admin-login.html');

    if (session && !isLoginPage) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username, phone, address')
                .eq('id', session.user.id)
                .single();
            
            // Check for missing profile or fields
            if (error || !profile || !profile.username || !profile.phone || !profile.address) {
                console.warn('Incomplete profile. Redirecting to login.');
                // Determine target URL based on current depth
                const isPagesDir = currentPath.includes('/pages/');
                const target = isPagesDir ? 'user-login.html' : 'pages/user-login.html';
                
                window.location.href = target;
                return; // Stop execution
            }
        } catch (err) {
            console.error('Profile check error:', err);
        }
    }

    // Select the login link/button in the navbar
    // We look for the link that points to the login page
    const loginLink = document.querySelector('a[href*="user-login.html"]');
    
    if (!loginLink) return;

    if (session) {
        // User is logged in
        console.log('User is logged in:', session.user.email);
        
        // Determine correct path to profile page based on current location
        // If we are in /pages/, it's just 'profile.html'
        // If we are in root, it's 'pages/profile.html'
        const currentPath = window.location.pathname;
        const isPagesDir = currentPath.includes('/pages/');
        const profileUrl = isPagesDir ? 'profile.html' : 'pages/profile.html';

        // Update the link to point to profile
        loginLink.href = profileUrl;
        loginLink.classList.add('auth-state-logged-in');

        // Create the avatar element
        // Use user metadata for name, or email fallback
        const userName = session.user.user_metadata?.full_name || session.user.email || 'User';
        const avatarUrl = session.user.user_metadata?.avatar_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=d4af37&color=fff`;

        // Replace content with avatar
        loginLink.innerHTML = `
            <img src="${avatarUrl}" alt="Profile" 
                style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 1px solid var(--color-primary, #d4af37);">
            <span class="nav-text">Profile</span>
        `;
    } else {
        // User is logged out - ensure it looks like Login
        // This is the default state, but we might need to revert if user logs out without refreshing
        // (though usually we redirect on logout)
        const isPagesDir = window.location.pathname.includes('/pages/');
        const loginUrl = isPagesDir ? 'user-login.html' : 'pages/user-login.html';
        
        loginLink.href = loginUrl;
        loginLink.innerHTML = `
            <svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Login
        `;
    }
}

// Run immediately on load
document.addEventListener('DOMContentLoaded', updateAuthUI);

// Also run when auth state changes (e.g. login/logout in another tab)
supabase.auth.onAuthStateChange((event, session) => {
    updateAuthUI();
});
