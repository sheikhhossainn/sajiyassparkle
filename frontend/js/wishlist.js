// Wishlist Page JavaScript
import { supabase } from './supabase.js';

const WISHLIST_KEY = 'sajiyasWishlist';
const CART_KEY = 'sajiyasCart';

let wishlistItems = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', function () {
    loadWishlist();
});

async function loadWishlist() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;

    if (currentUser) {
        // Fetch from DB
        const { data, error } = await supabase
            .from('wishlist')
            .select(`
                product_id, 
                products (
                    id, name, price, image_url, category, stock_status
                )
            `);
            
        if (!error && data) {
             wishlistItems = data.map(item => item.products).filter(p => p !== null);
        } else {
             console.error('Error fetching wishlist:', error);
             wishlistItems = [];
        }
    } else {
        // Guest mode - Wishlist disabled
        wishlistItems = [];
    }
    renderWishlist();
}

function saveWishlist() {
    // Disabled for guest
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
                        <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.99872 7.05 2.99872C5.59096 2.99872 4.19169 3.5783 3.16 4.61C2.1283 5.64169 1.54872 7.04096 1.54872 8.5C1.54872 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7563 5.72717 21.351 5.12084 20.84 4.61Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                    </svg>
                </button>
                <div class="wishlist-card-image">
                    <img src="${safeImage}" alt="${safeName}">
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
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const productId = Number(this.dataset.removeId);
            removeFromWishlist(productId);
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
    if (!currentUser) return; // Should not happen in UI, but safety check

    const card = document.querySelector(`.wishlist-card[data-product-id="${productId}"]`);
    
    // Update local state first (optimistic UI)
    wishlistItems = wishlistItems.filter((item) => Number(item.id) !== productId);

    if (currentUser) {
        // Remove from DB
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('product_id', productId);
            
        if (error) {
            console.error('Error removing from DB:', error);
        }
    }

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

    let cartItems = [];
    try {
        const raw = localStorage.getItem(CART_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        cartItems = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        cartItems = [];
    }

    const existing = cartItems.find((item) => Number(item.id) === productId);
    if (existing) {
        existing.quantity = Number(existing.quantity || 1) + 1;
    } else {
        cartItems.push({ ...product, quantity: 1 });
    }

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
