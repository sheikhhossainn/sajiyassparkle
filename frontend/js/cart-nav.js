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
})();
