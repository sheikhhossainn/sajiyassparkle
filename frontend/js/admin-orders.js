import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    setupSidebarToggle();
    setupLogout();

    const accessGranted = await ensureAdminAccess();
    if (!accessGranted) return;

    await loadOrdersPage();
});

function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (!menuToggle || !sidebar) return;
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
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

async function loadOrdersPage() {
    const orders = await fetchOrders();
    const profileById = await fetchProfilesMap(orders.map(o => o.user_id).filter(Boolean));
    const itemsByOrderId = await fetchOrderItemsMap(orders.map(o => o.id));

    updateOrderStats(orders);
    renderOrderCards(orders, profileById, itemsByOrderId);
}

async function fetchOrders() {
    const withAddress = await supabase
        .from('orders')
        .select('id, user_id, total_amount, status, created_at, delivery_address, shipping_address, address')
        .order('created_at', { ascending: false });

    if (!withAddress.error) return withAddress.data || [];

    const fallback = await supabase
        .from('orders')
        .select('id, user_id, total_amount, status, created_at')
        .order('created_at', { ascending: false });

    if (fallback.error) {
        console.error('Failed to load orders:', fallback.error.message);
        return [];
    }

    return fallback.data || [];
}

async function fetchProfilesMap(userIds) {
    if (userIds.length === 0) return new Map();

    const withAddress = await supabase
        .from('profiles')
        .select('id, username, email, phone, address')
        .in('id', userIds);

    if (!withAddress.error) {
        return new Map((withAddress.data || []).map(p => [p.id, p]));
    }

    const fallback = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

    return new Map(((fallback.data || [])).map(p => [p.id, p]));
}

async function fetchOrderItemsMap(orderIds) {
    if (orderIds.length === 0) return new Map();

    const nested = await supabase
        .from('order_items')
        .select('order_id, quantity, price_at_purchase, products(name)')
        .in('order_id', orderIds);

    const rows = nested.error ? [] : (nested.data || []);
    const map = new Map();

    rows.forEach(row => {
        if (!map.has(row.order_id)) map.set(row.order_id, []);
        map.get(row.order_id).push({
            name: row.products?.name || 'Item',
            quantity: row.quantity || 1,
            price: Number(row.price_at_purchase || 0)
        });
    });

    return map;
}

function normalizeStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value.includes('deliver')) return 'delivered';
    if (value.includes('complete')) return 'completed';
    if (value.includes('process')) return 'processing';
    if (value.includes('cancel')) return 'cancelled';
    return 'pending';
}

function updateOrderStats(orders) {
    const pending = orders.filter(o => normalizeStatus(o.status) === 'pending').length;
    const delivered = orders.filter(o => normalizeStatus(o.status) === 'delivered').length;
    const completed = orders.filter(o => normalizeStatus(o.status) === 'completed').length;

    setText('ordersPendingCount', pending);
    setText('ordersDeliveredCount', delivered);
    setText('ordersCompletedCount', completed);
    setText('ordersTotalCount', orders.length);
}

function renderOrderCards(orders, profileById, itemsByOrderId) {
    const container = document.getElementById('ordersCardsContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<div class="orders-empty">No orders found</div>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const profile = profileById.get(order.user_id) || {};
        const items = itemsByOrderId.get(order.id) || [];

        const customerName = profile.username || profile.email || 'Unknown customer';
        const customerEmail = profile.email || '-';
        const date = order.created_at
            ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '-';
        const total = Number(order.total_amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const statusKey = normalizeStatus(order.status);
        const address = order.delivery_address || order.shipping_address || order.address || profile.address || 'Not provided';

        const itemsHtml = items.length > 0
            ? `<ul class="items-list">${items.map(item => `<li>${item.name} x${item.quantity} (BDT ${Number(item.price).toLocaleString('en-BD')})</li>`).join('')}</ul>`
            : '<p class="customer-meta">No item details available</p>';

        return `
            <article class="order-card">
                <div class="order-card-head">
                    <div>
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-date">${date}</div>
                    </div>
                    <span class="status-chip ${statusKey}">${order.status || 'pending'}</span>
                </div>
                <div class="order-card-body">
                    <div class="customer-block">
                        <div class="customer-name">${customerName}</div>
                        <div class="customer-meta">${customerEmail}</div>
                        <p class="delivery-address"><strong>Delivery:</strong> ${address}</p>
                    </div>
                    <div>
                        <strong>Items</strong>
                        ${itemsHtml}
                    </div>
                    <div class="order-total">Total: BDT ${total}</div>
                </div>
            </article>`;
    }).join('');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}
