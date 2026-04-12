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

const ORDER_STATUS_FLOW = [
    'pending_verification',
    'payment_verified',
    'processing',
    'delivered',
    'rejected'
];

const ORDER_STATUS_LABEL = {
    pending_verification: 'Pending Verification',
    payment_verified: 'Payment Verified',
    processing: 'Processing',
    delivered: 'Delivered',
    rejected: 'Rejected'
};

const PAYMENT_METHOD_LABEL = {
    bkash: 'bKash',
    nagad: 'Nagad',
    cash_on_delivery: 'Cash on Delivery'
};

const state = {
    orders: [],
    profileById: new Map(),
    itemsByOrderId: new Map(),
    updatingOrderIds: new Set()
};

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
            await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
            console.warn('SignOut error:', err);
        }
        clearAdminSession();
        try {
            sessionStorage.clear();
        } catch (ex) {
            console.warn('Failed to clear session:', ex);
        }
        window.location.href = 'admin-login.html';
    });
}

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

async function loadOrdersPage() {
    await refreshOrders();
    setupRealtimeOrdersSubscription();
}

async function refreshOrders() {
    state.orders = await fetchOrders();
    state.profileById = await fetchProfilesMap(state.orders.map(o => o.user_id).filter(Boolean));
    state.itemsByOrderId = await fetchOrderItemsMap(state.orders.map(o => o.id));

    updateOrderStats(state.orders);
    renderOrderCards(state.orders, state.profileById, state.itemsByOrderId);
}

function setupRealtimeOrdersSubscription() {
    // Listen for order changes and auto-refresh
    const subscription = supabase
        .channel('orders')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
                console.log('Order update received:', payload);
                refreshOrders();
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Real-time orders subscription active');
            } else if (status === 'CHANNEL_ERROR') {
                console.warn('Real-time subscription error, will retry on page focus');
            }
        });

    // Refresh when page comes back to focus
    window.addEventListener('focus', () => {
        refreshOrders();
    });
}

async function fetchOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('id, user_id, total_amount, status, order_status, created_at, delivery_address, shipping_address, address, payment_method, transaction_id, sender_number')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to prevent loading too much data

    if (error) {
        console.error('Failed to load orders:', error.message);
        return [];
    }

    return data || [];
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
    const value = String(status || '').toLowerCase().trim();

    if (value === 'pending') return 'pending_verification';
    if (value.includes('pending verification')) return 'pending_verification';
    if (value.includes('pending_verification')) return 'pending_verification';
    if (value.includes('payment verified')) return 'payment_verified';
    if (value.includes('payment_verified')) return 'payment_verified';
    if (value === 'verified') return 'payment_verified';
    if (value.includes('process')) return 'processing';
    if (value.includes('deliver')) return 'delivered';
    if (value.includes('reject') || value.includes('cancel')) return 'rejected';

    return 'pending_verification';
}

function updateOrderStats(orders) {
    const pending = orders.filter(o => getOrderStatus(o) === 'pending_verification').length;
    const processing = orders.filter(o => getOrderStatus(o) === 'processing').length;
    const delivered = orders.filter(o => getOrderStatus(o) === 'delivered').length;
    const rejected = orders.filter(o => getOrderStatus(o) === 'rejected').length;

    setText('ordersPendingCount', pending);
    setText('ordersProcessingCount', processing);
    setText('ordersDeliveredCount', delivered);
    setText('ordersRejectedCount', rejected);
    setText('ordersTotalCount', orders.length);
}

function renderOrderCards(orders, profileById, itemsByOrderId) {
    const container = document.getElementById('ordersCardsContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<div class="orders-empty">No orders found</div>';
        return;
    }

    const orderedRowsHtml = orders.map(order => {
        const profile = profileById.get(order.user_id) || {};
        const items = itemsByOrderId.get(order.id) || [];

        const customerName = profile.username || profile.email || 'Unknown customer';
        const customerEmail = profile.email || '-';
        const date = order.created_at
            ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '-';
        const total = Number(order.total_amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const statusKey = getOrderStatus(order);
        const address = order.delivery_address || order.shipping_address || order.address || profile.address || 'Not provided';
        const paymentMethodKey = String(order.payment_method || 'cash_on_delivery').toLowerCase();
        const paymentMethod = PAYMENT_METHOD_LABEL[paymentMethodKey] || 'Cash on Delivery';
        const transactionId = order.transaction_id ? escapeHtml(order.transaction_id) : '-';
        const senderNumber = order.sender_number ? escapeHtml(order.sender_number) : '-';
        const isUpdating = state.updatingOrderIds.has(order.id);

        const itemsHtml = items.length > 0
            ? `<ul class="order-items-details" id="items-${order.id}">${items.map(item => `<li>${escapeHtml(item.name)} x${item.quantity} (৳${Number(item.price).toLocaleString('en-BD')})</li>`).join('')}</ul>`
            : '<div class="customer-meta order-items-details" id="items-' + order.id + '">No item details available</div>';

        const summaryItemsText = items.length > 0 ? `${items.length} product(s)` : `No products`;

        const statusOptionsHtml = ORDER_STATUS_FLOW
            .map(option => `<option value="${option}" ${option === statusKey ? 'selected' : ''}>${ORDER_STATUS_LABEL[option]}</option>`)
            .join('');

        return `
            <tr>
                <td data-label="Order ID">
                    <div class="order-id">#SJS-${order.id.toString().padStart(4, '0')}</div>
                    <div class="order-date">${date}</div>
                </td>
                <td data-label="Customer">
                    <div class="customer-name">${escapeHtml(customerName)}</div>
                    <div class="customer-meta">${escapeHtml(customerEmail)}</div>
                    <div class="delivery-address" style="margin-top: 0.5rem; font-size: 0.8rem;">
                        <strong>Delivery:</strong><br>${escapeHtml(address)}
                    </div>
                </td>
                <td data-label="Payment">
                    <div class="customer-name">${paymentMethod}</div>
                    <div class="customer-meta">TrxID: ${transactionId}</div>
                    <div class="customer-meta">Sender: ${senderNumber}</div>
                </td>
                <td data-label="Summary">
                    <div style="font-weight: 700;">৳${total}</div>
                    <div style="font-size: 0.8rem; color: var(--color-neutral-medium); margin-bottom: 0.25rem;">
                       ${summaryItemsText}
                    </div>
                    <button type="button" class="toggle-items-btn" onclick="const el = document.getElementById('items-${order.id}'); el.style.display = el.style.display === 'block' ? 'none' : 'block';">View Items</button>
                    ${itemsHtml}
                </td>
                <td data-label="Status Action">
                    <div style="margin-bottom: 0.5rem;">
                       <span class="status-chip ${statusKey}">${ORDER_STATUS_LABEL[statusKey]}</span>
                    </div>
                    <div class="status-control-row" style="display: flex; gap: 0.5rem;">
                        <select id="status-select-${order.id}" class="form-input order-status-select" data-order-id="${order.id}" ${isUpdating ? 'disabled' : ''} style="min-width: 130px; font-size: 0.8rem; padding: 0.25rem;">
                            ${statusOptionsHtml}
                        </select>
                        <button type="button" class="btn btn-secondary order-status-save" data-order-id="${order.id}" data-current-status="${statusKey}" ${isUpdating ? 'disabled' : ''} style="min-width: 60px; padding: 0.25rem 0.5rem; font-size: 0.8rem;">Save</button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 14%">Order ID</th>
                        <th style="width: 25%">Customer</th>
                        <th style="width: 22%">Payment</th>
                        <th style="width: 17%">Summary</th>
                        <th style="width: 22%">Status Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderedRowsHtml}
                </tbody>
            </table>
        </div>
    `;

    attachStatusControls();
}

function attachStatusControls() {
    document.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', (event) => {
            const orderId = Number(event.target.dataset.orderId);
            const saveBtn = document.querySelector(`.order-status-save[data-order-id="${orderId}"]`);
            if (!saveBtn) return;

            const currentStatus = String(saveBtn.dataset.currentStatus || '');
            const nextStatus = String(event.target.value || '');
            saveBtn.disabled = currentStatus === nextStatus;
        });
    });

    document.querySelectorAll('.order-status-save').forEach(button => {
        button.addEventListener('click', async (event) => {
            const orderId = Number(event.currentTarget.dataset.orderId);
            const select = document.querySelector(`.order-status-select[data-order-id="${orderId}"]`);
            if (!select) return;

            const nextStatus = String(select.value || '');
            const currentStatus = String(event.currentTarget.dataset.currentStatus || '');
            if (!nextStatus || nextStatus === currentStatus) return;

            await updateOrderStatus(orderId, nextStatus);
        });
    });
}

async function updateOrderStatus(orderId, nextStatus) {
    state.updatingOrderIds.add(orderId);
    renderOrderCards(state.orders, state.profileById, state.itemsByOrderId);

    let updateResult = await supabase
        .from('orders')
        .update({ status: nextStatus, order_status: nextStatus })
        .eq('id', orderId);

    if (updateResult.error && isMissingColumn(updateResult.error, 'order_status')) {
        updateResult = await supabase
            .from('orders')
            .update({ status: nextStatus })
            .eq('id', orderId);
    }

    state.updatingOrderIds.delete(orderId);

    if (updateResult.error) {
        console.error('Failed to update order status:', updateResult.error.message);
        alert(`Failed to update order status: ${updateResult.error.message}`);
        renderOrderCards(state.orders, state.profileById, state.itemsByOrderId);
        return;
    }

    state.orders = state.orders.map(order => {
        if (Number(order.id) !== Number(orderId)) return order;
        return {
            ...order,
            status: nextStatus,
            order_status: nextStatus
        };
    });

    updateOrderStats(state.orders);
    renderOrderCards(state.orders, state.profileById, state.itemsByOrderId);
}

function getOrderStatus(order) {
    return normalizeStatus(order.order_status || order.status);
}

function isMissingColumn(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes(`column \"${String(columnName).toLowerCase()}\"`) || message.includes('does not exist');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}
