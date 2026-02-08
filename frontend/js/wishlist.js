// Wishlist Page JavaScript

// Initialize wishlist functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Wishlist page loaded');
    
    updateWishlistCount();
    initializeRemoveButtons();
    initializeAddToCartButtons();
});

// Update wishlist count
function updateWishlistCount() {
    const wishlistGrid = document.getElementById('wishlist-grid');
    const wishlistEmpty = document.getElementById('wishlist-empty');
    const wishlistCount = document.getElementById('wishlist-count');
    const wishlistCards = document.querySelectorAll('.wishlist-card');
    
    const count = wishlistCards.length;
    
    if (count === 0) {
        // Show empty state
        wishlistGrid.style.display = 'none';
        wishlistEmpty.style.display = 'flex';
        wishlistCount.textContent = 'No items saved';
    } else {
        // Show wishlist grid
        wishlistGrid.style.display = 'grid';
        wishlistEmpty.style.display = 'none';
        wishlistCount.textContent = count === 1 ? '1 item saved' : `${count} items saved`;
    }
}

// Initialize remove buttons
function initializeRemoveButtons() {
    const removeButtons = document.querySelectorAll('.wishlist-remove-btn');
    
    removeButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const card = button.closest('.wishlist-card');
            const productName = card.querySelector('.wishlist-card-title').textContent;
            
            // Confirm removal
            if (confirm(`Remove "${productName}" from your wishlist?`)) {
                removeFromWishlist(card);
            }
        });
    });
}

// Remove item from wishlist
function removeFromWishlist(card) {
    // Add removing class for animation
    card.classList.add('removing');
    
    // Remove card after animation completes
    setTimeout(function() {
        card.remove();
        updateWishlistCount();
        
        // Show notification
        showNotification('Item removed from wishlist');
    }, 300);
}

// Initialize Add to Cart buttons
function initializeAddToCartButtons() {
    const addToCartButtons = document.querySelectorAll('.wishlist-card-button');
    
    addToCartButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const card = button.closest('.wishlist-card');
            const productName = card.querySelector('.wishlist-card-title').textContent;
            const productPrice = card.querySelector('.wishlist-card-price').textContent;
            
            // Add to cart (placeholder functionality)
            console.log(`Adding to cart: ${productName} - ${productPrice}`);
            showNotification(`${productName} added to cart!`);
        });
    });
}

// Show notification (simple alert, can be replaced with toast notification)
function showNotification(message) {
    // Simple implementation - can be enhanced with a custom toast component
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
    
    // Remove notification after 3 seconds
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add keyframe animations for notification
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
