// common/auth-state.js or similar
import { supabase } from './supabase.js';

const ADMIN_ONLY_EMAIL = 'admin@local.test';

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
    const currentPath = window.location.pathname.toLowerCase();

    if (session && String(session.user?.email || '').toLowerCase() === ADMIN_ONLY_EMAIL && !currentPath.includes('admin-login.html')) {
        await supabase.auth.signOut();
        const isPagesDir = currentPath.includes('/pages/');
        window.location.href = isPagesDir ? 'admin-login.html' : 'pages/admin-login.html';
        return;
    }
    
    // Check if we are already on a login page
    const isLoginPage = currentPath.includes('user-login.html') || currentPath.includes('admin-login.html');

    if (session && !isLoginPage) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username, phone, address, is_admin')
                .eq('id', session.user.id)
                .single();
            
            const isAdmin = profile?.is_admin === true;

            // For admins, do not enforce phone/address completeness.
            // For customers, keep the full profile requirement.
            if (error || !profile || !profile.username || (!isAdmin && (!profile.phone || !profile.address))) {
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
        const avatarUrl = resolveGoogleAvatarUrl(session.user) || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=d4af37&color=fff`;

        // Replace content with avatar and robust fallback
        loginLink.textContent = '';

        const avatarImage = document.createElement('img');
        avatarImage.src = avatarUrl;
        avatarImage.alt = 'Profile';
        avatarImage.setAttribute('referrerpolicy', 'no-referrer');
        avatarImage.style.width = '26px';
        avatarImage.style.height = '26px';
        avatarImage.style.borderRadius = '50%';
        avatarImage.style.objectFit = 'cover';
        avatarImage.style.border = '1px solid var(--color-primary, #d4af37)';
        avatarImage.addEventListener('error', () => {
            avatarImage.remove();

            const initials = String(userName)
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(part => part.charAt(0).toUpperCase())
                .join('') || 'U';

            const badge = document.createElement('span');
            badge.textContent = initials;
            badge.style.display = 'inline-flex';
            badge.style.alignItems = 'center';
            badge.style.justifyContent = 'center';
            badge.style.width = '26px';
            badge.style.height = '26px';
            badge.style.borderRadius = '50%';
            badge.style.background = '#f5f5f5';
            badge.style.border = '1px solid var(--color-primary, #d4af37)';
            badge.style.fontSize = '0.72rem';
            badge.style.fontWeight = '700';

            loginLink.prepend(badge);
        });

        const navText = document.createElement('span');
        navText.className = 'nav-text';
        navText.textContent = 'Profile';

        loginLink.appendChild(avatarImage);
        loginLink.appendChild(navText);
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

function resolveGoogleAvatarUrl(user) {
    const identityData = Array.isArray(user?.identities)
        ? user.identities.map(identity => identity?.identity_data || {})
        : [];

    const candidates = [
        ...identityData.map(data => data.avatar_url),
        ...identityData.map(data => data.picture),
        user?.user_metadata?.avatar_url,
        user?.user_metadata?.picture
    ];

    const firstValid = candidates.find(url => typeof url === 'string' && url.trim().length > 0);
    if (!firstValid) return '';
    
    return String(firstValid).trim();
}
