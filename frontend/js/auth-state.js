// common/auth-state.js or similar
import { supabase } from './supabase.js';

function markAuthUiReady() {
    if (document.body) {
        document.body.classList.add('auth-ui-ready');
    }
}

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

// Store session in sessionStorage to prevent flickering on page navigation
function getCachedSessionSync() {
    try {
        const cached = sessionStorage.getItem('_supabase_session_cache');
        if (cached) {
            return JSON.parse(cached);
        }

        // Fallback: read Supabase persisted auth token synchronously.
        // This avoids a brief "Login" flash on first page load/new tab.
        const localKey = Object.keys(localStorage).find(
            (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        if (!localKey) return null;

        const raw = localStorage.getItem(localKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const fromWrapped = parsed?.currentSession || parsed?.session || null;
        const fromDirect = parsed?.user ? parsed : null;
        const session = fromWrapped || fromDirect;

        if (session?.user) {
            sessionStorage.setItem('_supabase_session_cache', JSON.stringify(session));
            return session;
        }

        return null;
    } catch (e) {
        return null;
    }
}

function setCachedSession(session) {
    try {
        sessionStorage.setItem('_supabase_session_cache', JSON.stringify(session));
    } catch (e) {
        console.warn('Failed to cache session:', e);
    }
}

// Track the last rendered state to prevent unnecessary re-renders
let lastRenderedUserId = null;
let lastRenderedIsLoggedIn = null;

// Seed render tracker from cached session to avoid repainting over
// the inline bootstrap render on first load.
const initialCachedSession = getCachedSessionSync();
lastRenderedIsLoggedIn = initialCachedSession !== null;
lastRenderedUserId = initialCachedSession?.user?.id || null;

// Render the auth UI based on session
function renderAuthUI(session) {
    const currentPath = window.location.pathname.toLowerCase();
    const isLoggedIn = session !== null;
    const userId = session?.user?.id;
    
    // Only re-render if state actually changed
    if (lastRenderedIsLoggedIn === isLoggedIn && lastRenderedUserId === userId) {
        return;
    }
    
    lastRenderedIsLoggedIn = isLoggedIn;
    lastRenderedUserId = userId;
    
    // Select the login link/button in the navbar
    const loginLink = document.querySelector('a[href*="user-login.html"]');
    
    if (!loginLink) return;

    if (session) {
        // User is logged in
        console.log('User is logged in:', session.user.email);
        
        // Determine correct path to profile page based on current location
        // If we are in /pages/, it's just 'profile.html'
        // If we are in root, it's 'pages/profile.html'
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
        const isPagesDir = currentPath.includes('/pages/');
        const loginUrl = isPagesDir ? 'user-login.html' : 'pages/user-login.html';
        
        loginLink.href = loginUrl;
        loginLink.classList.remove('auth-state-logged-in');
        loginLink.innerHTML = `
            <svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Login
        `;
    }

    markAuthUiReady();
}

async function updateAuthUI() {
    try {
        handleAuthErrors();

        // Get cached session and render immediately - no async calls
        const session = getCachedSessionSync();
        renderAuthUI(session);

        const currentPath = window.location.pathname.toLowerCase();

        // Do all validations asynchronously without touching the DOM
        // Verify session matches cached version
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        
        // Update cache silently
        if (freshSession) {
            setCachedSession(freshSession);
        } else {
            sessionStorage.removeItem('_supabase_session_cache');
        }

        // Check if we are on a login page
        const isLoginPage = currentPath.includes('user-login.html') || currentPath.includes('admin-login.html');

        if (freshSession) {
            const postLogin = sessionStorage.getItem('post_login_redirect');
            if (postLogin) {
                sessionStorage.removeItem('post_login_redirect');
                const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', freshSession.user.id).single();
                const isAdmin = profile?.is_admin === true;
                const isPagesDir = currentPath.includes('/pages/');

                if (postLogin === 'admin') {
                    if (isAdmin) {
                        window.location.href = isPagesDir ? 'admin-dashboard.html' : 'pages/admin-dashboard.html';
                    } else {
                        await supabase.auth.signOut();
                        alert('Access Denied: You do not have administrator privileges.');
                        window.location.href = isPagesDir ? 'user-login.html' : 'pages/user-login.html';
                    }
                    return;
                } else if (postLogin === 'user' && isAdmin) {
                    window.location.href = isPagesDir ? 'admin-dashboard.html' : 'pages/admin-dashboard.html';
                    return;
                }
            }
        }

        // Validate admin access and profile completeness (no DOM changes)
        if (freshSession && !isLoginPage) {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('username, phone, address, is_admin')
                    .eq('id', freshSession.user.id)
                    .single();
                
                const isAdmin = profile?.is_admin === true;

                if (isAdmin) {
                    const profileLink = document.querySelector('a[href*="profile.html"], a[href*="user-login.html"]');
                    if (profileLink) {
                        const isPagesDir = currentPath.includes('/pages/');
                        profileLink.href = isPagesDir ? 'admin-dashboard.html' : 'pages/admin-dashboard.html';
                        const navText = profileLink.querySelector('.nav-text');
                        if (navText) navText.textContent = 'Dashboard';
                    }
                }

                // For admins, do not enforce phone/address completeness.
                // For customers, keep the full profile requirement.
                if (error || !profile || !profile.username || (!isAdmin && (!profile.phone || !profile.address))) {
                    console.warn('Incomplete profile. Redirecting to login.');
                    // Determine target URL based on current depth
                    const isPagesDir = currentPath.includes('/pages/');
                    const target = isPagesDir ? 'user-login.html' : 'pages/user-login.html';
                    
                    window.location.href = target;
                    return; 
                }
            } catch (err) {
                console.error('Profile check error:', err);
            }
        }
    } catch (err) {
        console.error('Failed to verify session:', err);
    } finally {
        // Ensure the auth slot is revealed even if an early error occurs.
        markAuthUiReady();
    }
}

// Run as early as possible (scripts are loaded at end of body on these pages)
updateAuthUI();

// Also run when auth state changes (e.g. login/logout in another tab)
supabase.auth.onAuthStateChange((event, session) => {
    const cachedSession = getCachedSessionSync();
    const sessionId = session?.user?.id;
    const cachedId = cachedSession?.user?.id;
    
    // Only update if the actual login state changed (not on every event)
    if ((session === null) !== (cachedSession === null) || sessionId !== cachedId) {
        setCachedSession(session);
        renderAuthUI(session);
    }
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
