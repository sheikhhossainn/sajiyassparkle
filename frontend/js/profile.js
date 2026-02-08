// Profile Page JavaScript

// Initialize profile page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Handle edit profile button
    const editProfileBtn = document.querySelector('.profile-edit-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            alert('Edit profile functionality coming soon!');
        });
    }
    
    // Handle view order details buttons
    const orderDetailsBtns = document.querySelectorAll('.order-details-btn');
    orderDetailsBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const orderItem = btn.closest('.order-item');
            const orderNumber = orderItem.querySelector('.order-number').textContent;
            alert(`Viewing details for ${orderNumber}`);
        });
    });
    
    // Add smooth hover effects
    const orderItems = document.querySelectorAll('.order-item');
    orderItems.forEach(function(item) {
        item.addEventListener('mouseenter', function() {
            this.style.borderColor = 'var(--color-accent-gold)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.borderColor = 'var(--color-border)';
        });
    });
});
