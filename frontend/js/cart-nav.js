(function () {
    function getCartCount() {
        try {
            const raw = localStorage.getItem('sajiyasCart');
            const cart = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(cart)) return 0;
            return cart.reduce((sum, item) => sum + Number(item?.quantity || 1), 0);
        } catch (err) {
            console.warn('Unable to read cart from localStorage:', err);
            return 0;
        }
    }

    function updateNavCartCount() {
        const total = getCartCount();
        const cartCountElements = document.querySelectorAll('#cart-count');

        cartCountElements.forEach((el) => {
            el.textContent = String(total);
        });
    }

    document.addEventListener('DOMContentLoaded', updateNavCartCount);
    window.addEventListener('storage', (event) => {
        if (event.key === 'sajiyasCart') {
            updateNavCartCount();
        }
    });

    // Allow other scripts to force-refresh the nav count after cart updates.
    window.updateNavCartCount = updateNavCartCount;

    // --- Mobile Hamburger Menu Setup ---
    document.addEventListener('DOMContentLoaded', () => {
        const navbarContainer = document.querySelector('.navbar-container');
        const navLinks = document.querySelector('.nav-links');
        
        if (navbarContainer && navLinks && !document.querySelector('.hamburger-menu')) {
            const btn = document.createElement('button');
            btn.classList.add('hamburger-menu');
            btn.setAttribute('aria-label', 'Toggle navigation');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            
            // Insert before the nav-actions so it flows nicely
            const navActions = document.querySelector('.nav-actions');
            if(navActions) {
                navActions.after(btn);
            } else {
                navbarContainer.appendChild(btn);
            }
            
            btn.addEventListener('click', () => {
                const isActive = navLinks.classList.toggle('active');
                if (isActive) {
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    `;
                } else {
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    `;
                }
            });
        }
    });

})();



