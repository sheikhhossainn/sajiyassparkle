// ============================================
// Admin Dashboard Functionality
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard loaded');

    // ============================================
    // Dark Mode Toggle
    // ============================================
    
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.icon-sun');
    const moonIcon = document.querySelector('.icon-moon');
    
    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
    
    // Toggle theme on button click
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            
            // Toggle icon visibility
            if (document.body.classList.contains('dark-mode')) {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
                localStorage.setItem('theme', 'dark');
                console.log('Dark mode enabled');
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
                localStorage.setItem('theme', 'light');
                console.log('Light mode enabled');
            }
        });
    }

    // ============================================
    // Quick Action Buttons
    // ============================================
    
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const actionTitle = this.querySelector('h3').textContent;
            console.log('Action clicked:', actionTitle);
            
            // Here you would typically navigate to the appropriate page
            // For now, just show an alert
            alert(`Action: ${actionTitle}\n\nThis would navigate to the ${actionTitle.toLowerCase()} page.`);
        });
    });

    // ============================================
    // View Order Buttons
    // ============================================
    
    const viewButtons = document.querySelectorAll('.btn-action');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const orderId = row.querySelector('td:first-child').textContent;
            console.log('View order clicked:', orderId);
            
            // Here you would typically open order details
            alert(`Opening order details for ${orderId}`);
        });
    });

    // ============================================
    // Edit Product Buttons
    // ============================================
    
    const editButtons = document.querySelectorAll('.product-card-button');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('.product-card-title').textContent;
            console.log('Edit product clicked:', productName);
            
            // Here you would typically open product edit page
            alert(`Opening edit page for: ${productName}`);
        });
    });

    // ============================================
    // Real-time Updates Simulation (Demo)
    // ============================================
    
    // Simulate real-time notification updates (in a real app, this would be via WebSocket or polling)
    function updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent);
            // Randomly update (just for demo)
            if (Math.random() > 0.8) {
                badge.textContent = currentCount + 1;
                console.log('New notification received');
            }
        }
    }

    // Update every 30 seconds (demo only)
    setInterval(updateNotificationBadge, 30000);

    // ============================================
    // Logout Functionality
    // ============================================
    
    const logoutLink = document.querySelector('a[href*="admin-login"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            const confirmed = confirm('Are you sure you want to logout?');
            if (confirmed) {
                console.log('User logged out');
                // Redirect to login page with the secret hash
                window.location.href = 'admin-login.html#-Sa7iyA';
            }
        });
    }

    // ============================================
    // Table Row Highlighting
    // ============================================
    
    const tableRows = document.querySelectorAll('.orders-table tbody tr');
    
    tableRows.forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't trigger if clicking the action button
            if (!e.target.closest('.btn-action')) {
                // Remove highlight from all rows
                tableRows.forEach(r => r.style.backgroundColor = '');
                // Highlight clicked row
                this.style.backgroundColor = 'var(--color-neutral-light)';
            }
        });
    });

    console.log('Admin Dashboard initialized successfully');
});
