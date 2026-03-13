// Wishlist Page JavaScript

const WISHLIST_KEY = 'sajiyasWishlist';
const CART_KEY = 'sajiyasCart';

let wishlistItems = [];

document.addEventListener('DOMContentLoaded', function () {
    loadWishlist();
    renderWishlist();
});

function loadWishlist() {
    try {
        const raw = localStorage.getItem(WISHLIST_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        wishlistItems = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to parse wishlist data:', error);
        wishlistItems = [];
    }
}

function saveWishlist() {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistItems));
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
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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

function removeFromWishlist(productId) {
    const card = document.querySelector(`.wishlist-card[data-product-id="${productId}"]`);
    wishlistItems = wishlistItems.filter((item) => Number(item.id) !== productId);
    saveWishlist();

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
