import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    setupSidebarToggle();
    setupLogout();
    setupQuickButtons();

    const accessGranted = await ensureAdminAccess();
    if (!accessGranted) return;

    await loadDashboardData();
});

function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (!menuToggle || !sidebar) return;
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

function setupQuickButtons() {
    const goOrders = document.getElementById('goOrders');
    const goProducts = document.getElementById('goProducts');
    const goCustomers = document.getElementById('goCustomers');

    if (goOrders) goOrders.addEventListener('click', () => { window.location.href = 'admin-orders.html'; });
    if (goProducts) goProducts.addEventListener('click', () => { window.location.href = 'admin-products.html'; });
    if (goCustomers) goCustomers.addEventListener('click', () => { window.location.href = 'admin-customers.html'; });
}

function setupLogout() {
    const logoutLink = document.querySelector('.sidebar-logout');
    if (!logoutLink) return;

    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.warn('Admin logout signOut error:', error);
        } finally {
            window.location.href = '../index.html';
        }
    });
}

async function ensureAdminAccess() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
        window.location.href = 'admin-login.html';
        return false;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (error || !profile?.is_admin) {
        alert('Access denied. Admin account required.');
        await supabase.auth.signOut();
        window.location.href = 'admin-login.html';
        return false;
    }

    return true;
}

async function loadDashboardData() {
    const [{ count: productCount }, { count: customerCount }, { data: ordersData, error: ordersErr }, profilesData] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('is_admin', true),
        supabase.from('orders').select('id, user_id, total_amount, status, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('id, username, email')
    ]);

    if (ordersErr) {
        console.error('Failed to load orders:', ordersErr);
    }

    const orders = ordersData || [];
    const profiles = profilesData.data || [];
    const profileById = new Map(profiles.map(p => [p.id, p]));

    const pending = orders.filter(o => normalizeStatus(o.status) === 'pending').length;
    const delivered = orders.filter(o => normalizeStatus(o.status) === 'delivered').length;
    const completed = orders.filter(o => normalizeStatus(o.status) === 'completed').length;

    setText('statTotalOrders', orders.length);
    setText('statPending', pending);
    setText('statDelivered', delivered);
    setText('statCompleted', completed);
    setText('statCustomers', customerCount || 0);
    setText('statProducts', productCount || 0);

    renderLatestOrders(orders.slice(0, 8), profileById);
}

function normalizeStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value.includes('deliver')) return 'delivered';
    if (value.includes('complete')) return 'completed';
    if (value.includes('process')) return 'processing';
    if (value.includes('cancel')) return 'cancelled';
    return 'pending';
}

function renderLatestOrders(orders, profileById) {
    const tbody = document.getElementById('latestOrdersBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No orders yet</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const profile = profileById.get(order.user_id) || {};
        const customer = profile.username || profile.email || 'Unknown customer';
        const total = Number(order.total_amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const statusKey = normalizeStatus(order.status);
        const date = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

        return `
            <tr>
                <td>#${order.id}</td>
                <td>${customer}</td>
                <td>BDT ${total}</td>
                <td><span class="status-pill ${statusKey}">${order.status || 'pending'}</span></td>
                <td>${date}</td>
            </tr>`;
    }).join('');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}
