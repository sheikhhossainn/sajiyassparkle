import { supabase } from './supabase.js';

// Wishlist Page JavaScript

const CART_KEY = 'sajiyasCart';

let wishlistItems = [];
let currentUserId = null;
let cartItemsCache = [];
const cartSyncTimers = new Map();

async function ensureCartExists(userId) {
    if (!userId) return;
    try {
        await supabase.from('carts').upsert({ user_id: userId });
    } catch (err) {
        console.warn('ensureCartExists failed', err);
    }
}

async function upsertCartItem(userId, product, quantity) {
    if (!userId || !product) return;
    await ensureCartExists(userId);

    if (quantity <= 0) {
        await supabase.from('cart_items')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', product.id);
        return;
    }

    await supabase.from('cart_items').upsert({
        user_id: userId,
        product_id: product.id,
        quantity,
        price_at_add: Number(product.price || 0)
    });
}

function scheduleCartSync(product, quantity) {
    if (!currentUserId || !product) return;

    const key = String(product.id);
    if (quantity <= 0) {
        const existingTimer = cartSyncTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);
        cartSyncTimers.delete(key);
        upsertCartItem(currentUserId, product, 0);
        return;
    }

    const existingTimer = cartSyncTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
        cartSyncTimers.delete(key);
        upsertCartItem(currentUserId, product, quantity);
    }, 350);

    cartSyncTimers.set(key, timer);
}

document.addEventListener('DOMContentLoaded', function () {
    initializeWishlistPage();
});

async function initializeWishlistPage() {
    currentUserId = await getCurrentUserId();

    if (!currentUserId) {
        redirectToLogin();
        return;
    }

    const mainContent = document.getElementById('main-wishlist-content');
    if (mainContent) mainContent.style.opacity = '1';

    await loadWishlistFromSupabase();
    renderWishlist();
}

async function getCurrentUserId() {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.warn('Could not fetch auth user:', error.message);
            return null;
        }
        return data?.user?.id || null;
    } catch (error) {
        console.warn('Auth user lookup failed:', error);
        return null;
    }
}

function redirectToLogin() {
    const isPagesDir = window.location.pathname.includes('/pages/');
    const loginUrl = isPagesDir ? 'user-login.html' : 'pages/user-login.html';
    window.location.href = loginUrl;
}

function getMaxQuantity(product, existingItem = null) {
    const productStock = Number(product?.stock_quantity);
    const existingStock = Number(existingItem?.stock_quantity);

    if (Number.isFinite(productStock) && productStock > 0) return productStock;
    if (Number.isFinite(existingStock) && existingStock > 0) return existingStock;

    return 99;
}

function normalizeCategory(rawCategory) {
    const category = String(rawCategory || '').toLowerCase().trim();

    if (category.startsWith('setitems')) return 'setitems';
    if (category.startsWith('ring')) return 'rings';
    if (category.startsWith('earring')) return 'earrings';
    if (category.startsWith('bracelet')) return 'bracelets';
    if (category.startsWith('necklace')) return 'necklaces';

    return category;
}

function getPriceRangeForCategory(product) {
    const category = normalizeCategory(product?.category);
    const productName = String(product?.name || '').toLowerCase();

    // Override only for jewellery sets that specifically mention ring/bracelet.
    if (category === 'setitems' && (productName.includes('ring') || productName.includes('bracelet'))) {
        return [300, 350];
    }

    if (category === 'rings') return [150, 220];
    if (category === 'necklaces') return [200, 280];
    if (category === 'bracelets') return [150, 220];
    if (category === 'earrings') return [150, 220];
    if (category === 'setitems') return [200, 500];

    return null;
}

function getFixedPriceOverride(product) {
    const name = String(product?.name || '').toLowerCase().trim();

    if (name === 'nechlace+earring+ring 1' || name === 'necklace+earring+ring 1') return 500;
    if (name === 'necklace+bracelet+ring') return 400;
    if (name === 'necklace+earring 1') return 420;
    if (name === 'necklace+earring+bracelet') return 450;

    return null;
}

function getDeterministicCategoryPrice(product) {
    const fixedPrice = getFixedPriceOverride(product);
    if (fixedPrice !== null) return fixedPrice;

    const range = getPriceRangeForCategory(product);
    if (!range) return Number(product?.price || 0);

    const [min, max] = range;
    const start = Math.ceil(min / 5) * 5;
    const end = Math.floor(max / 5) * 5;
    if (start > end) return Number(product?.price || 0);

    const steps = Math.floor((end - start) / 5) + 1;
    const seed = `${product?.id ?? ''}-${product?.name ?? ''}-${product?.category ?? ''}`;
    let hash = 0;

    for (let i = 0; i < seed.length; i += 1) {
        hash = ((hash * 31) + seed.charCodeAt(i)) | 0;
    }

    const stepIndex = Math.abs(hash) % steps;
    return start + (stepIndex * 5);
}

function computeWishlistPrice(product) {
    const price = Number(product?.price);
    if (Number.isFinite(price) && price > 0 && price !== 99) return price;
    return getDeterministicCategoryPrice(product);
}

async function loadWishlistFromSupabase() {
    if (!currentUserId) {
        wishlistItems = [];
        return;
    }

    const { data, error } = await supabase
        .from('wishlist')
        .select('product_id, created_at, products!wishlist_product_id_fkey(id,name,price,image_url,category,stock_status,stock_quantity)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Failed to load wishlist from Supabase:', error.message);
        wishlistItems = [];
        return;
    }

    wishlistItems = (data || [])
        .map(row => row.products)
        .filter(Boolean)
        .map(product => ({
            id: product.id,
            name: product.name,
            price: computeWishlistPrice(product),
            image_url: product.image_url || '',
            category: product.category || '',
            stock_status: product.stock_status || 'in_stock',
            stock_quantity: Number(product.stock_quantity) || 0
        }));
}

function renderWishlist() {
    const wishlistGrid = document.getElementById('wishlist-grid');
    const wishlistEmpty = document.getElementById('wishlist-empty');
    const wishlistCount = document.getElementById('wishlist-count');

    if (!wishlistGrid || !wishlistEmpty || !wishlistCount) return;

    if (wishlistItems.length === 0) {
        wishlistGrid.style.display = 'none';
        wishlistEmpty.style.display = 'flex';
        wishlistCount.textContent = 'No items saved';
        wishlistGrid.innerHTML = '';
        return;
    }

    wishlistGrid.style.display = 'grid';
    wishlistEmpty.style.display = 'none';
    wishlistCount.textContent = wishlistItems.length === 1 ? '1 item saved' : `${wishlistItems.length} items saved`;

    wishlistGrid.innerHTML = wishlistItems.map((item) => {
        const safeName = escapeHtml(item.name || 'Jewelry Item');
        const safeImage = item.image_url || item.image || 'https://placehold.co/400x300/f5f5f5/333333?text=Jewelry';
        const price = Number(item.price || 0).toLocaleString('en-BD');

        return `
            <div class="wishlist-card" data-product-id="${item.id}">
                <button class="wishlist-remove-btn" data-remove-id="${item.id}" aria-label="Remove from wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.99872 7.05 2.99872C5.59096 2.99872 4.19169 3.5783 3.16 4.61C2.1283 5.64169 1.54872 7.04096 1.54872 8.5C1.54872 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7563 5.72717 21.351 5.12084 20.84 4.61Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div class="wishlist-card-image">
                    <img src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" width="400" height="300">
                </div>
                <div class="wishlist-card-content">
                    <h3 class="wishlist-card-title">${safeName}</h3>
                    <p class="wishlist-card-price">BDT ${price}</p>
                    <button class="btn btn-primary wishlist-card-button" data-add-id="${item.id}">Add to Cart</button>
                </div>
            </div>
        `;
    }).join('');

    bindWishlistEvents();
}

function bindWishlistEvents() {
    const removeButtons = document.querySelectorAll('.wishlist-remove-btn');
    const addToCartButtons = document.querySelectorAll('.wishlist-card-button');

    removeButtons.forEach((button) => {
        button.addEventListener('click', async function (e) {
            e.preventDefault();
            const productId = Number(this.dataset.removeId);
            await removeFromWishlist(productId);
        });
    });

    addToCartButtons.forEach((button) => {
        button.addEventListener('click', function () {
            const productId = Number(this.dataset.addId);
            addToCart(productId);
        });
    });
}

async function removeFromWishlist(productId) {
    if (!currentUserId) {
        showNotification('Please log in to manage wishlist');
        return;
    }

    const card = document.querySelector(`.wishlist-card[data-product-id="${productId}"]`);
    const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', currentUserId)
        .eq('product_id', productId);

    if (error) {
        showNotification('Could not remove from wishlist');
        return;
    }

    wishlistItems = wishlistItems.filter((item) => Number(item.id) !== productId);

    if (card) {
        card.classList.add('removing');
        setTimeout(() => {
            renderWishlist();
            showNotification('Item removed from wishlist');
        }, 300);
    } else {
        renderWishlist();
        showNotification('Item removed from wishlist');
    }
}

function addToCart(productId) {
    const product = wishlistItems.find((item) => Number(item.id) === productId);
    if (!product) return;

    if (!currentUserId) {
        showNotification('Please log in to add items to cart');
        return;
    }

    let cartItems = [];
    try {
        const raw = localStorage.getItem(CART_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        cartItems = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        cartItems = [];
    }

    const existing = cartItems.find((item) => Number(item.id) === productId);
    const maxQuantity = getMaxQuantity(product, existing);
    const currentQtyRaw = Number(existing?.quantity || 0);
    const currentQty = Math.max(0, currentQtyRaw);
    const clampedCurrent = Math.min(currentQty, maxQuantity);

    if (existing && clampedCurrent !== currentQtyRaw) {
        existing.quantity = clampedCurrent;
        existing.stock_quantity = maxQuantity;
    }

    if (clampedCurrent >= maxQuantity) {
        localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
        if (typeof window.updateNavCartCount === 'function') {
            window.updateNavCartCount();
        }
        showNotification(`You can only add ${maxQuantity} of this item (stock limit).`);
        return;
    }

    const nextQty = existing ? Math.min(maxQuantity, clampedCurrent + 1) : 1;

    if (existing) {
        existing.quantity = nextQty;
        existing.stock_quantity = maxQuantity;
    } else {
        cartItems.push({ ...product, quantity: nextQty, stock_quantity: maxQuantity });
    }

    // Persist to Supabase cart (debounced)
    scheduleCartSync(product, nextQty);

    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    if (typeof window.updateNavCartCount === 'function') {
        window.updateNavCartCount();
    }

    showNotification(`${product.name || 'Item'} added to cart`);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background-color: var(--color-secondary);
        color: var(--color-white);
        padding: 1rem 1.5rem;
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-hover);
        z-index: 9999;
        font-family: var(--font-body);
        font-size: var(--font-size-small);
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(function () {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function () {
            notification.remove();
        }, 300);
    }, 1800);
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
