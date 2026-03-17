import { supabase } from './supabase.js';

const CART_KEY = 'sajiyasCart';
const SHOP_MOBILE_PAYMENT_NUMBER = '01614409676';

let cartItems = [];
let checkoutUserId = null;
const cartSyncTimers = new Map();

async function loadCartFromSupabase(userId) {
    try {
        const { data, error } = await supabase
            .from('cart_items')
            .select('product_id, quantity, price_at_add, products(id,name,price,image_url,category,stock_status,stock_quantity)')
            .eq('user_id', userId);

        if (error) throw error;

        return (data || []).map(row => {
            const p = row.products || {};
            return {
                id: Number(row.product_id),
                name: p.name,
                price: Number(p.price ?? row.price_at_add ?? 0),
                image_url: p.image_url || '',
                category: p.category || '',
                stock_status: p.stock_status || 'in_stock',
                stock_quantity: Number(p.stock_quantity) || 0,
                quantity: Math.max(1, Number(row.quantity || 1))
            };
        });
    } catch (err) {
        console.error('Could not load cart from Supabase:', err);
        return [];
    }
}

async function upsertCartItem(userId, productId, quantity, price) {
    if (!userId) return;
    if (quantity <= 0) {
        await supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId);
        return;
    }
    await supabase.from('carts').upsert({ user_id: userId });
    await supabase.from('cart_items').upsert({
        user_id: userId,
        product_id: productId,
        quantity,
        price_at_add: price
    });
}

function scheduleCartSync(productId, quantity, price) {
    if (!checkoutUserId) return;
    const key = String(productId);

    if (quantity <= 0) {
        const existingTimer = cartSyncTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);
        cartSyncTimers.delete(key);
        upsertCartItem(checkoutUserId, productId, 0, price);
        return;
    }

    const existingTimer = cartSyncTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
        cartSyncTimers.delete(key);
        upsertCartItem(checkoutUserId, productId, quantity, price);
    }, 350);

    cartSyncTimers.set(key, timer);
}

async function clearCartInSupabase(userId) {
    if (!userId) return;
    await supabase.from('cart_items').delete().eq('user_id', userId);
}

function getMaxQuantity(item) {
    const stock = Number(item?.stock_quantity);
    if (Number.isFinite(stock) && stock > 0) return stock;
    return 99;
}

function persistCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    if (typeof window.updateNavCartCount === 'function') {
        window.updateNavCartCount();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAuthenticatedCheckoutAccess();
    if (!user) return;
    checkoutUserId = user.id;

    const mainContent = document.getElementById('main-checkout-content');
    if (mainContent) {
        mainContent.style.opacity = '1';
    }

    setupUiEvents();
    toggleMobilePaymentFields();

    cartItems = await loadCartFromSupabase(user.id);
    cartItems = cartItems.map(item => ({ ...item, user_id: user.id }));
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    renderOrderSummary(cartItems);

    await prefillProfileDetails();
});

async function ensureAuthenticatedCheckoutAccess() {
    try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error) {
            throw error;
        }

        const user = sessionData?.session?.user;
        if (!user) {
            window.location.href = 'user-login.html';
            return null;
        }

        return user;
    } catch (err) {
        console.error('Checkout auth guard failed:', err);
        window.location.href = 'user-login.html';
        return null;
    }
}

function setupUiEvents() {
    const paymentMethod = document.getElementById('paymentMethod');
    const submitBtn = document.getElementById('submitBtn');
    const closeAlertBtn = document.getElementById('errorAlertClose');

    if (paymentMethod) {
        paymentMethod.addEventListener('change', () => {
            toggleMobilePaymentFields();
            clearFieldError('paymentMethod');
            clearFieldError('senderNumber');
            clearFieldError('transactionId');
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }

    if (closeAlertBtn) {
        closeAlertBtn.addEventListener('click', hideErrorAlert);
    }

    document.querySelectorAll('.form-input').forEach((input) => {
        input.addEventListener('blur', () => {
            if (String(input.value || '').trim()) {
                clearFieldError(input.id);
            }
        });
    });
}

function renderOrderSummary(items) {
    const container = document.getElementById('orderItemsContainer');

    if (!container) return;

    if (!items.length) {
        container.innerHTML = '<p class="customer-meta">Your cart is empty. Please add items before checkout.</p>';
        setSummaryValues(0, 0, 0);
        setSubmitButtonCartState(false);
        return;
    }

    setSubmitButtonCartState(true);

    container.innerHTML = items.map(item => {
        const name = escapeHtml(item.name || 'Product');
        const quantity = Math.max(1, Number(item.quantity || 1));
        const price = Number(item.price || 0);
        const image = escapeHtml(item.image_url || item.image || 'https://placehold.co/100x100?text=Item');
        const maxQuantity = getMaxQuantity(item);

        return `
            <div class="order-item-card">
                <div class="order-item-image">
                    <img src="${image}" alt="${name}">
                </div>
                <div class="order-item-details">
                    <h3 class="order-item-title">${name}</h3>
                    <div class="order-item-qty-control" data-product-id="${item.id}">
                        <button class="quantity-btn" data-action="decrement" data-product-id="${item.id}" aria-label="Decrease quantity">-</button>
                        <span class="order-item-quantity">${quantity}</span>
                        <button class="quantity-btn" data-action="increment" data-product-id="${item.id}" aria-label="Increase quantity">+</button>
                        <span class="order-item-max">Max ${maxQuantity}</span>
                    </div>
                </div>
                <div class="order-item-price">BDT ${formatMoney(price * quantity)}</div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.quantity-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const productId = Number(e.currentTarget.dataset.productId);
            const action = e.currentTarget.dataset.action;
            if (!productId || !action) return;

            const delta = action === 'increment' ? 1 : -1;
            adjustCartQuantity(productId, delta);
        });
    });

    const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const tax = 0;
    const total = subtotal + tax;

    setSummaryValues(subtotal, tax, total);
}

async function adjustCartQuantity(productId, delta) {
    const index = cartItems.findIndex(item => Number(item.id) === Number(productId));
    if (index === -1) return;

    const item = cartItems[index];
    const maxQty = getMaxQuantity(item);
    const currentQty = Math.max(0, Number(item.quantity || 1));
    const nextQty = Math.min(maxQty, currentQty + delta);

    const userId = checkoutUserId;

    if (nextQty <= 0) {
        cartItems.splice(index, 1);
        scheduleCartSync(productId, 0, Number(item.price || 0));
    } else {
        item.quantity = nextQty;
        item.stock_quantity = maxQty;
        scheduleCartSync(productId, nextQty, Number(item.price || 0));
    }

    persistCart();
    renderOrderSummary(cartItems);
}

function setSummaryValues(subtotal, tax, total) {
    setText('summarySubtotal', `BDT ${formatMoney(subtotal)}`);
    setText('summaryTax', `BDT ${formatMoney(tax)}`);
    setText('summaryTotal', `BDT ${formatMoney(total)}`);
}

function setSubmitButtonCartState(hasItems) {
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');

    if (!submitBtn || !submitBtnText) return;

    submitBtn.disabled = !hasItems;
    submitBtnText.textContent = hasItems ? 'Proceed to Payment' : 'Cart Is Empty';
}

function toggleMobilePaymentFields() {
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'cash_on_delivery';
    const mobileFields = document.getElementById('mobilePaymentFields');
    const instructions = document.getElementById('paymentInstructions');
    const senderNumber = document.getElementById('senderNumber');
    const transactionId = document.getElementById('transactionId');

    const isMobilePayment = paymentMethod === 'bkash' || paymentMethod === 'nagad';

    if (mobileFields) {
        mobileFields.hidden = !isMobilePayment;
        mobileFields.style.display = isMobilePayment ? 'flex' : 'none';
    }

    if (senderNumber) senderNumber.required = isMobilePayment;
    if (transactionId) transactionId.required = isMobilePayment;

    if (instructions) {
        if (isMobilePayment) {
            const label = paymentMethod === 'bkash' ? 'bKash' : 'Nagad';
            instructions.innerHTML = `
                <strong>${label} Send Money Instructions:</strong>
                Send the total amount to <strong>${SHOP_MOBILE_PAYMENT_NUMBER}</strong>,
                then enter your sender number and transaction ID below.
            `;
        } else {
            instructions.textContent = '';
        }
    }
}

function validateForm() {
    let isValid = true;

    clearFormErrors();

    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const address = document.getElementById('address');
    const city = document.getElementById('city');
    const state = document.getElementById('state');
    const postalCode = document.getElementById('postalCode');
    const paymentMethod = document.getElementById('paymentMethod');
    const senderNumber = document.getElementById('senderNumber');
    const transactionId = document.getElementById('transactionId');

    if (!String(fullName?.value || '').trim()) {
        showFieldError('fullName', 'Full name is required');
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!String(email?.value || '').trim()) {
        showFieldError('email', 'Email address is required');
        isValid = false;
    } else if (!emailRegex.test(email.value.trim())) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }

    const phoneRegex = /^(\+?88)?01[3-9]\d{8}$/;
    if (!String(phone?.value || '').trim()) {
        showFieldError('phone', 'Phone number is required');
        isValid = false;
    } else if (!phoneRegex.test(phone.value.trim())) {
        showFieldError('phone', 'Please enter a valid Bangladeshi phone number');
        isValid = false;
    }

    if (!String(address?.value || '').trim()) {
        showFieldError('address', 'Street address is required');
        isValid = false;
    }

    if (!String(city?.value || '').trim()) {
        showFieldError('city', 'City is required');
        isValid = false;
    }

    if (!String(state?.value || '').trim()) {
        showFieldError('state', 'Please select a division');
        isValid = false;
    }

    const postalRegex = /^\d{4}$/;
    if (!String(postalCode?.value || '').trim()) {
        showFieldError('postalCode', 'Postal code is required');
        isValid = false;
    } else if (!postalRegex.test(postalCode.value.trim())) {
        showFieldError('postalCode', 'Please enter a valid 4-digit postal code');
        isValid = false;
    }

    const method = String(paymentMethod?.value || '');
    if (!method) {
        showFieldError('paymentMethod', 'Please select a payment method');
        isValid = false;
    }

    const isMobilePayment = method === 'bkash' || method === 'nagad';
    if (isMobilePayment) {
        const senderRegex = /^(\+?88)?01[3-9]\d{8}$/;
        if (!String(senderNumber?.value || '').trim()) {
            showFieldError('senderNumber', 'Sender number is required');
            isValid = false;
        } else if (!senderRegex.test(senderNumber.value.trim())) {
            showFieldError('senderNumber', 'Enter a valid sender number');
            isValid = false;
        }

        const trxRegex = /^[A-Za-z0-9]{6,30}$/;
        if (!String(transactionId?.value || '').trim()) {
            showFieldError('transactionId', 'Transaction ID is required');
            isValid = false;
        } else if (!trxRegex.test(transactionId.value.trim())) {
            showFieldError('transactionId', 'Enter a valid transaction ID');
            isValid = false;
        }
    }

    if (!cartItems.length) {
        showErrorAlert('Your cart is empty. Please add items to continue checkout.');
        isValid = false;
    }

    return isValid;
}

async function handleSubmit() {
    hideErrorAlert();

    if (!validateForm()) {
        showErrorAlert('Please fix the errors in the form before proceeding.');
        return;
    }

    setLoading(true);

    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = sessionData?.session?.user;
        if (!user) {
            showErrorAlert('Please log in before placing an order.');
            setTimeout(() => {
                window.location.href = 'user-login.html';
            }, 1000);
            return;
        }

        const orderResult = await createOrder(user.id);
        if (!orderResult?.id) {
            throw new Error('Order could not be created.');
        }

        await clearCartInSupabase(user.id);
        localStorage.removeItem(CART_KEY);
        if (typeof window.updateNavCartCount === 'function') {
            window.updateNavCartCount();
        }

        window.location.href = `order-confirmation.html?order_id=${orderResult.id}`;
    } catch (error) {
        console.error('Checkout submit error:', error);
        showErrorAlert(error.message || 'An error occurred while placing your order. Please try again.');
    } finally {
        setLoading(false);
    }
}

async function createOrder(userId) {
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'cash_on_delivery';
    const senderNumber = String(document.getElementById('senderNumber')?.value || '').trim() || null;
    const transactionId = String(document.getElementById('transactionId')?.value || '').trim() || null;

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const initialOrderStatus = paymentMethod === 'cash_on_delivery' ? 'processing' : 'pending_verification';

    const addressParts = [
        String(document.getElementById('address')?.value || '').trim(),
        String(document.getElementById('city')?.value || '').trim(),
        String(document.getElementById('state')?.value || '').trim(),
        String(document.getElementById('postalCode')?.value || '').trim()
    ].filter(Boolean);

    const deliveryAddress = addressParts.join(', ');

    const orderPayload = {
        user_id: userId,
        total_amount: subtotal,
        status: initialOrderStatus,
        order_status: initialOrderStatus,
        payment_method: paymentMethod,
        transaction_id: paymentMethod === 'cash_on_delivery' ? null : transactionId,
        sender_number: paymentMethod === 'cash_on_delivery' ? null : senderNumber,
        address: deliveryAddress,
        shipping_address: deliveryAddress,
        delivery_address: deliveryAddress
    };

    let { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single();

    if (orderError && isMissingColumn(orderError, 'order_status')) {
        const fallbackPayload = { ...orderPayload };
        delete fallbackPayload.order_status;

        const fallback = await supabase
            .from('orders')
            .insert(fallbackPayload)
            .select('id')
            .single();

        order = fallback.data;
        orderError = fallback.error;
    }

    if (orderError) {
        throw orderError;
    }

    const orderItemsPayload = cartItems.map(item => ({
        order_id: order.id,
        product_id: Number(item.id),
        quantity: Number(item.quantity || 1),
        price_at_purchase: Number(item.price || 0)
    }));

    const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

    if (orderItemsError) {
        await supabase.from('orders').delete().eq('id', order.id);
        throw orderItemsError;
    }

    return order;
}

async function prefillProfileDetails() {
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = sessionData?.session?.user;
        if (!user) return;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, email, phone, address')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.warn('Could not fetch profile for checkout prefill:', profileError.message);
            return;
        }

        setInputValueIfEmpty('fullName', profile?.username);
        setInputValueIfEmpty('email', profile?.email || user.email);
        setInputValueIfEmpty('phone', profile?.phone);
        setInputValueIfEmpty('address', profile?.address);
    } catch (error) {
        console.warn('Checkout prefill error:', error);
    }
}

function setInputValueIfEmpty(id, value) {
    const input = document.getElementById(id);
    if (!input || !value) return;
    if (!String(input.value || '').trim()) {
        input.value = String(value);
    }
}

function setLoading(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('submitBtnText');
    const btnLoader = document.getElementById('submitBtnLoader');

    if (!submitBtn || !btnText || !btnLoader) return;

    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    const inputEl = document.getElementById(fieldId);

    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('error');
}

function clearFieldError(fieldId) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    const inputEl = document.getElementById(fieldId);

    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.classList.remove('error');
}

function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
    });

    document.querySelectorAll('.form-input').forEach(el => {
        el.classList.remove('error');
    });
}

function showErrorAlert(message) {
    const alertEl = document.getElementById('errorAlert');
    const messageEl = document.getElementById('errorMessage');

    if (!alertEl || !messageEl) return;

    messageEl.textContent = message;
    alertEl.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideErrorAlert() {
    const alertEl = document.getElementById('errorAlert');
    if (alertEl) alertEl.style.display = 'none';
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
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
