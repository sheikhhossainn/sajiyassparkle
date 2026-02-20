// Unified Shop Page JavaScript
// Combines category browsing with product listing

// Sample product data
const productsData = [
    { id: 1, name: "Diamond Solitaire Ring", category: "rings", price: 45000, image: "ring1.jpg", featured: true, date: "2026-02-01" },
    { id: 2, name: "Gold Engagement Ring", category: "rings", price: 32000, image: "ring2.jpg", featured: true, date: "2026-01-28" },
    { id: 3, name: "Pearl Necklace Set", category: "necklaces", price: 28000, image: "necklace1.jpg", featured: false, date: "2026-01-25" },
    { id: 4, name: "Diamond Pendant Necklace", category: "necklaces", price: 55000, image: "necklace2.jpg", featured: true, date: "2026-02-03" },
    { id: 5, name: "Ruby Drop Earrings", category: "earrings", price: 18000, image: "earring1.jpg", featured: false, date: "2026-01-20" },
    { id: 6, name: "Diamond Stud Earrings", category: "earrings", price: 42000, image: "earring2.jpg", featured: true, date: "2026-02-02" },
    { id: 7, name: "Gold Bangle Bracelet", category: "bracelets", price: 25000, image: "bracelet1.jpg", featured: false, date: "2026-01-15" },
    { id: 8, name: "Diamond Tennis Bracelet", category: "bracelets", price: 68000, image: "bracelet2.jpg", featured: true, date: "2026-02-04" },
    { id: 9, name: "Bridal Necklace Set", category: "bridal", price: 125000, image: "bridal1.jpg", featured: true, date: "2026-02-05" },
    { id: 10, name: "Wedding Ring Set", category: "bridal", price: 95000, image: "bridal2.jpg", featured: true, date: "2026-02-06" },
    { id: 11, name: "Sapphire Ring", category: "rings", price: 38000, image: "ring3.jpg", featured: false, date: "2026-01-18" },
    { id: 12, name: "Emerald Necklace", category: "necklaces", price: 72000, image: "necklace3.jpg", featured: false, date: "2026-01-22" },
    { id: 13, name: "Gold Hoop Earrings", category: "earrings", price: 12000, image: "earring3.jpg", featured: false, date: "2026-01-12" },
    { id: 14, name: "Silver Charm Bracelet", category: "bracelets", price: 8500, image: "bracelet3.jpg", featured: false, date: "2026-01-10" },
    { id: 15, name: "Platinum Band Ring", category: "rings", price: 52000, image: "ring4.jpg", featured: true, date: "2026-01-30" },
    { id: 16, name: "Choker Necklace", category: "necklaces", price: 22000, image: "necklace4.jpg", featured: false, date: "2026-01-14" },
    { id: 17, name: "Crystal Drop Earrings", category: "earrings", price: 15000, image: "earring4.jpg", featured: false, date: "2026-01-16" },
    { id: 18, name: "Rose Gold Bracelet", category: "bracelets", price: 19000, image: "bracelet4.jpg", featured: false, date: "2026-01-19" },
];

// State management
let currentProducts = [...productsData];
let currentView = 'grid';
let currentPage = 1;
let selectedCategory = 'all';
const itemsPerPage = 9;

// DOM elements
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const priceFilter = document.getElementById('price-filter');
const sortBy = document.getElementById('sort-by');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const resultsCount = document.getElementById('results-count');
const clearFiltersBtn = document.getElementById('clear-filters');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const pagination = document.getElementById('pagination');
const cartCount = document.getElementById('cart-count');
const toggleFiltersBtn = document.getElementById('toggle-filters');
const advancedFilters = document.getElementById('advanced-filters');
const categoryPills = document.querySelectorAll('.category-pill');

// Initialize cart from localStorage
let cart = JSON.parse(localStorage.getItem('sajiyasCart')) || [];
updateCartCount();

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    attachEventListeners();
    updateCategoryPillCounts();
});

// Initialize page
function initializePage() {
    // Check URL parameters for category
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    
    if (urlCategory && urlCategory !== 'all') {
        selectedCategory = urlCategory;
        updateCategoryPillActive(urlCategory);
    }
    
    renderProducts();
}

// Event Listeners
function attachEventListeners() {
    // Category pills
    categoryPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            handleCategoryChange(category);
        });
    });
    
    // Advanced filters toggle
    toggleFiltersBtn.addEventListener('click', toggleAdvancedFilters);
    
    // Search and filters
    searchInput.addEventListener('input', debounce(handleFilters, 300));
    priceFilter.addEventListener('change', handleFilters);
    sortBy.addEventListener('change', handleFilters);
    
    // View toggle
    gridViewBtn.addEventListener('click', () => switchView('grid'));
    listViewBtn.addEventListener('click', () => switchView('list'));
    
    // Clear filters
    clearFiltersBtn.addEventListener('click', clearAllFilters);
}

// Toggle advanced filters
function toggleAdvancedFilters() {
    const isHidden = advancedFilters.style.display === 'none';
    advancedFilters.style.display = isHidden ? 'block' : 'none';
    
    // Rotate chevron icon
    const chevron = toggleFiltersBtn.querySelector('.chevron');
    chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

// Handle category change
function handleCategoryChange(category) {
    selectedCategory = category;
    updateCategoryPillActive(category);
    currentPage = 1;
    handleFilters();
}

// Update active category pill
function updateCategoryPillActive(category) {
    categoryPills.forEach(pill => {
        if (pill.dataset.category === category) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
}

// Update category pill counts
function updateCategoryPillCounts() {
    categoryPills.forEach(pill => {
        const category = pill.dataset.category;
        const countSpan = pill.querySelector('.pill-count');
        
        if (category === 'all') {
            countSpan.textContent = productsData.length;
        } else {
            const count = productsData.filter(p => p.category === category).length;
            countSpan.textContent = count;
        }
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle all filters
function handleFilters() {
    showLoading();
    
    setTimeout(() => {
        let filtered = [...productsData];
        
        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(product => product.category === selectedCategory);
        }
        
        // Search filter
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Price filter
        const selectedPrice = priceFilter.value;
        if (selectedPrice !== 'all') {
            filtered = filtered.filter(product => {
                if (selectedPrice === '50000+') {
                    return product.price >= 50000;
                }
                const [min, max] = selectedPrice.split('-').map(Number);
                return product.price >= min && product.price <= max;
            });
        }
        
        // Sort
        const sortOption = sortBy.value;
        filtered = sortProducts(filtered, sortOption);
        
        currentProducts = filtered;
        currentPage = 1;
        
        hideLoading();
        renderProducts();
        
        // Show/hide clear filters button
        const hasFilters = searchTerm || selectedPrice !== 'all' || sortOption !== 'featured';
        clearFiltersBtn.style.display = hasFilters ? 'inline-block' : 'none';
    }, 300);
}

// Sort products
function sortProducts(products, sortOption) {
    const sorted = [...products];
    
    switch(sortOption) {
        case 'price-low-high':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price-high-low':
            return sorted.sort((a, b) => b.price - a.price);
        case 'newest':
            return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'name-asc':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'featured':
        default:
            return sorted.sort((a, b) => b.featured - a.featured);
    }
}

// Clear all filters
function clearAllFilters() {
    searchInput.value = '';
    priceFilter.value = 'all';
    sortBy.value = 'featured';
    selectedCategory = 'all';
    updateCategoryPillActive('all');
    handleFilters();
}

// Switch view (grid/list)
function switchView(view) {
    currentView = view;
    
    if (view === 'grid') {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        productsGrid.classList.remove('list-view');
        productsGrid.classList.add('grid-view');
    } else {
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        productsGrid.classList.remove('grid-view');
        productsGrid.classList.add('list-view');
    }
}

// Render products
function renderProducts() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = currentProducts.slice(startIndex, endIndex);
    
    // Update results count
    resultsCount.textContent = currentProducts.length;
    
    // Show empty state if no products
    if (currentProducts.length === 0) {
        productsGrid.innerHTML = '';
        emptyState.style.display = 'flex';
        pagination.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Render products with animation
    productsGrid.innerHTML = paginatedProducts.map((product, index) => {
        return createProductCard(product, index);
    }).join('');
    
    // Animate products in
    animateProductCards();
    
    // Render pagination
    renderPagination();
    
    // Attach product event listeners
    attachProductListeners();
}

// Create product card HTML
function createProductCard(product, index) {
    const isInCart = cart.some(item => item.id === product.id);
    
    return `
        <div class="product-card" data-product-id="${product.id}" style="animation-delay: ${index * 0.05}s">
            <div class="product-image-wrapper">
                <div class="product-image-placeholder">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L4 6L6 18L12 22L18 18L20 6L12 2Z" fill="#d4af37" stroke="#d4af37" stroke-width="1.5"/>
                        <path d="M12 2L8 10H16L12 2Z" fill="#f0e68c"/>
                    </svg>
                </div>
                ${product.featured ? '<span class="product-badge">Featured</span>' : ''}
                <button class="wishlist-btn" data-product-id="${product.id}" aria-label="Add to wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.99872 7.05 2.99872C5.59096 2.99872 4.19169 3.5783 3.16 4.61C2.1283 5.64169 1.54872 7.04096 1.54872 8.5C1.54872 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7563 5.72717 21.351 5.12084 20.84 4.61Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${formatCategory(product.category)}</p>
                <p class="product-price">BDT ${product.price.toLocaleString('en-BD')}</p>
                <button class="btn btn-primary add-to-cart-btn ${isInCart ? 'in-cart' : ''}" data-product-id="${product.id}">
                    ${isInCart ? 'In Cart' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `;
}

// Animate product cards
function animateProductCards() {
    const cards = productsGrid.querySelectorAll('.product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Format category name
function formatCategory(category) {
    const categoryMap = {
        'rings': 'Rings',
        'necklaces': 'Necklaces',
        'earrings': 'Earrings',
        'bracelets': 'Bracelets',
        'bridal': 'Others'
    };
    return categoryMap[category] || category;
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(currentProducts.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination-buttons">';
    
    // Previous button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                data-page="${currentPage - 1}" 
                ${currentPage === 1 ? 'disabled' : ''}>
            Previous
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Next button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                data-page="${currentPage + 1}" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
    `;
    
    paginationHTML += '</div>';
    pagination.innerHTML = paginationHTML;
    
    // Attach pagination listeners
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                renderProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// Attach product-specific event listeners
function attachProductListeners() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.productId);
            addToCart(productId);
        });
    });
    
    // Wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(e.currentTarget.dataset.productId);
            toggleWishlist(productId);
        });
    });
}

// Add product to cart
function addToCart(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        showNotification('Product already in cart!', 'info');
        return;
    }
    
    cart.push({ ...product, quantity: 1 });
    localStorage.setItem('sajiyasCart', JSON.stringify(cart));
    updateCartCount();
    
    // Update button state
    const btn = document.querySelector(`.add-to-cart-btn[data-product-id="${productId}"]`);
    if (btn) {
        btn.textContent = 'In Cart';
        btn.classList.add('in-cart');
    }
    
    showNotification('Added to cart!', 'success');
}

// Toggle wishlist
function toggleWishlist(productId) {
    const btn = document.querySelector(`.wishlist-btn[data-product-id="${productId}"]`);
    btn.classList.toggle('active');
    
    const isActive = btn.classList.contains('active');
    showNotification(isActive ? 'Added to wishlist!' : 'Removed from wishlist!', 'info');
}

// Update cart count
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show loading state
function showLoading() {
    loadingState.style.display = 'flex';
    productsGrid.style.opacity = '0.5';
}

// Hide loading state
function hideLoading() {
    loadingState.style.display = 'none';
    productsGrid.style.opacity = '1';
}
