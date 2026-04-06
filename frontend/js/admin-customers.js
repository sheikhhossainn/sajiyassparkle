import { supabase } from './supabase.js';

const ADMIN_SESSION_KEY = '_admin_session';

function getAdminSession() {
    try {
        const cached = sessionStorage.getItem(ADMIN_SESSION_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        return null;
    }
}

function clearAdminSession() {
    try {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (error) {
        console.warn('Failed to clear admin session:', error);
    }
}

let allCustomers = [];

document.addEventListener('DOMContentLoaded', async () => {
    setupSidebarToggle();
    setupLogout();

    const accessGranted = await ensureAdminAccess();
    if (!accessGranted) return;

    await loadCustomers();
    setupSearch();
});

// ============================================
// Admin Access Guard
// ============================================
async function ensureAdminAccess() {
    const adminSession = getAdminSession();
    const userId = adminSession?.user?.id;

    if (!userId) {
        clearAdminSession();
        window.location.href = 'admin-login.html';
        return false;
    }

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (error || !profile?.is_admin) {
            alert('Access denied. Admin account required.');
            clearAdminSession();
            window.location.href = 'admin-login.html';
            return false;
        }

        setInterval(() => {
            if (!getAdminSession()) {
                clearAdminSession();
                window.location.href = 'admin-login.html';
            }
        }, 30000);

        return true;
    } catch (err) {
        console.error('Error checking admin access:', err);
        return false;
    }
}

// ============================================
// Sidebar Toggle (mobile)
// ============================================
function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (!menuToggle || !sidebar) return;
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

function setupLogout() {
    const logoutLink = document.querySelector('.sidebar-logout');
    if (!logoutLink) return;

    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearAdminSession();
        sessionStorage.setItem('_supabase_force_signed_out', String(Date.now()));
        const sbKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (sbKey) localStorage.removeItem(sbKey);
        window.location.href = 'admin-login.html';
    });
}

// ============================================
// Load Customers
// ============================================
async function loadCustomers() {
    try {
        let { data, error } = await supabase
            .from('profiles')
            .select('id, username, email, address, phone, created_at')
            .neq('is_admin', true)
            .order('created_at', { ascending: false });

        if (error) {
            // Retry without optional columns
            const result = await supabase
                .from('profiles')
                .select('id, username, email, created_at')
                .neq('is_admin', true)
                .order('created_at', { ascending: false });
            data = result.error ? [] : (result.data || []);
        }

        allCustomers = data || [];
        renderCustomers(allCustomers);
        updateCountLabel(allCustomers.length, allCustomers.length);
    } catch (err) {
        console.error('loadCustomers error:', err);
        renderCustomers([]);
    }
}

// ============================================
// Render Table
// ============================================
function renderCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="no-customers">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <p>No customers found</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = customers.map(c => {
        const nameRaw = c.username || c.email?.split('@')[0] || 'Unknown';
        const initial = nameRaw.charAt(0).toUpperCase();
        const email   = c.email || '—';
        const phone   = c.phone || c.phone_number || '—';
        const address = c.address || '—';
        const joined  = c.created_at
            ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        return `<tr>
            <td>
                <div class="customer-name-cell">
                    <span class="customer-avatar">${initial}</span>
                    ${nameRaw}
                </div>
            </td>
            <td><span class="badge-email">${email}</span></td>
            <td>${phone}</td>
            <td>${address}</td>
            <td>${joined}</td>
        </tr>`;
    }).join('');
}

// ============================================
// Search
// ============================================
function setupSearch() {
    const input = document.getElementById('customerSearch');
    if (!input) return;
    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        const filtered = q
            ? allCustomers.filter(c =>
                (c.username || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q))
            : allCustomers;
        renderCustomers(filtered);
        updateCountLabel(filtered.length, allCustomers.length);
    });
}

function updateCountLabel(shown, total) {
    const label = document.getElementById('customersCountLabel');
    const count = document.getElementById('customersShownCount');
    if (label) label.textContent = `${total} registered customer${total !== 1 ? 's' : ''}`;
    if (count) count.textContent = shown < total ? `Showing ${shown} of ${total}` : `${total} total`;
}
