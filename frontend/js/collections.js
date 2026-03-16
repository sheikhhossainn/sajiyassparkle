import { supabase } from './supabase.js';

// Unified Shop Page JavaScript
// Combines category browsing with product listing

// Product data is loaded from Supabase.
let productsData = [];

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
let wishlist = [];
let currentUserId = null;
updateCartCount();

const cartSyncTimers = new Map();

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

async function ensureCartExists(userId) {
    if (!userId) return;
    try {
        await supabase.from('carts').upsert({ user_id: userId });
    } catch (err) {
        console.warn('ensureCartExists failed', err);
    }
}

async function loadCartFromSupabase(userId) {
    if (!userId) {
        cart = [];
        persistCart();
        return;
    }

    try {
        const { data, error } = await supabase
            .from('cart_items')
            .select('product_id, quantity, price_at_add, products(id,name,price,image_url,category,stock_status,stock_quantity)')
            .eq('user_id', userId);

        if (error) {
            console.warn('Could not load cart from Supabase:', error.message);
            return;
        }

        cart = (data || []).map(row => {
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

        persistCart();
    } catch (err) {
        console.warn('Failed to load cart from Supabase:', err);
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

function persistCart() {
    localStorage.setItem('sajiyasCart', JSON.stringify(cart));
    updateCartCount();
    if (typeof window.updateNavCartCount === 'function') {
        window.updateNavCartCount();
    }
}

function getResolvedImageUrl(rawImage) {
    const value = String(rawImage || '').trim();
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    const normalized = value.replace(/^\/+/, '');
    const pathCandidate = normalized.startsWith('products/') ? normalized : `products/${normalized}`;
    const { data } = supabase.storage.from('products').getPublicUrl(pathCandidate);
    return data?.publicUrl || '';
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

function applyCategoryPriceMapping(products) {
    return (products || []).map((product) => ({
        ...product,
        price: getDeterministicCategoryPrice(product)
    }));
}

function isWishlisted(productId) {
    return wishlist.some(item => Number(item.id) === Number(productId));
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

async function loadWishlistFromSupabase(userId) {
    if (!userId) {
        wishlist = [];
        return;
    }

    const { data, error } = await supabase
        .from('wishlist')
        .select('product_id, products!wishlist_product_id_fkey(id,name,price,image_url,category,stock_status,stock_quantity)')
        .eq('user_id', userId);

    if (error) {
        console.warn('Failed to load wishlist from Supabase:', error.message);
        wishlist = [];
        return;
    }

    wishlist = (data || [])
        .map(row => row.products)
        .filter(Boolean)
        .map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url || '',
            category: product.category || '',
            stock_status: product.stock_status || 'in_stock',
            stock_quantity: Number(product.stock_quantity) || 0
        }));
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    attachEventListeners();
});

// Initialize page
async function initializePage() {
    // Show loading state while fetching potentially
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id,name,category,price,image_url,featured,description,stock_status,stock_quantity,created_at');
        if (!error && data && data.length > 0) {
            productsData = applyCategoryPriceMapping(data);
            // Update current products based on new data
            currentProducts = [...productsData];
            console.log('Loaded products from Supabase');
        } else {
            productsData = [];
            currentProducts = [];
            console.warn('No products returned from Supabase. Showing empty state.');
        }
    } catch (e) {
        productsData = [];
        currentProducts = [];
        console.warn('Supabase fetch failed. Showing empty state:', e);
    }

    // Check URL parameters for category and search
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    const urlSearch = (urlParams.get('search') || '').trim();
    
    if (urlCategory && urlCategory !== 'all') {
        selectedCategory = urlCategory;
        updateCategoryPillActive(urlCategory);
    }

    if (searchInput && urlSearch) {
        searchInput.value = urlSearch;
    }
    
    // Update category counts after data is loaded
    updateCategoryPillCounts();

    currentUserId = await getCurrentUserId();
    await Promise.all([
        loadWishlistFromSupabase(currentUserId),
        loadCartFromSupabase(currentUserId)
    ]);

    const hasInitialFilters = (urlCategory && urlCategory !== 'all') || Boolean(urlSearch);
    if (hasInitialFilters) {
        handleFilters();
        // Scroll to results when coming from a filtered link (e.g. Featured section)
        setTimeout(() => {
            const target = document.querySelector('.category-quick-filters');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }, 500);
    } else {
        renderProducts();
    }
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
    
    // Clear search input when switching categories to ensure items are shown
    if (searchInput) {
        searchInput.value = '';
    }

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

function normalizeCategory(rawCategory) {
    const category = String(rawCategory || '').toLowerCase().trim();

    if (category.startsWith('setitems')) return 'setitems';
    if (category.startsWith('ring')) return 'rings';
    if (category.startsWith('earring')) return 'earrings';
    if (category.startsWith('bracelet')) return 'bracelets';
    if (category.startsWith('necklace')) return 'necklaces';

    return category;
}

function categoryMatches(productCategory, selected) {
    const normalizedProduct = normalizeCategory(productCategory);
    const normalizedSelected = normalizeCategory(selected);

    if (normalizedSelected === 'all') return true;
    return normalizedProduct === normalizedSelected;
}

// Update category pill counts
function updateCategoryPillCounts() {
    categoryPills.forEach(pill => {
        const category = pill.dataset.category.toLowerCase();
        const countSpan = pill.querySelector('.pill-count');

        if (category === 'all') {
            countSpan.textContent = productsData.length;
        } else {
            const count = productsData.filter(p => categoryMatches(p.category, category)).length;
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
            filtered = filtered.filter(product => categoryMatches(product.category, selectedCategory));
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
                if (selectedPrice.endsWith('+')) {
                    return product.price >= parseInt(selectedPrice);
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
            return sorted.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
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
    const itemsToRender = currentProducts.slice(startIndex, endIndex);
    const displayCount = currentProducts.length;
    resultsCount.textContent = displayCount;
    
    // Show empty state if no products
    if (displayCount === 0) {
        productsGrid.innerHTML = '';
        emptyState.style.display = 'flex';
        pagination.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';

    // Render products with animation
    productsGrid.innerHTML = itemsToRender.map((product, index) => {
        return createProductCard(product, index);
    }).join('');
    
    // Animate products in
    animateProductCards();
    
    // Render pagination
    renderPagination();
    
    // Attach product event listeners
    attachProductListeners();
}

function createProductCard(product, index) {
    const cartItem = cart.find(item => item.id === product.id);
    const isInCart = Boolean(cartItem);
    const cartQuantity = cartItem ? Math.max(1, Number(cartItem.quantity || 1)) : 0;
    const maxQuantity = cartItem ? getMaxQuantity(product, cartItem) : null;
    
    // Check if we have an image URL from Supabase, otherwise mock data image
    const imageUrl = getResolvedImageUrl(product.image_url || product.image);
    
    // Check stock status
    const stockStatus = product.stock_status || 'in_stock';
    const isOutOfStock = stockStatus === 'out_of_stock';
    
    // Fallback placeholder logic
    const imageHTML = imageUrl
        ? `<img src="${imageUrl}" alt="${product.name}" class="product-image ${isOutOfStock ? 'out-of-stock-img' : ''}" loading="lazy">`
        : `<div class="product-image-placeholder">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L4 6L6 18L12 22L18 18L20 6L12 2Z" fill="#d4af37" stroke="#d4af37" stroke-width="1.5"/>
                  <path d="M12 2L8 10H16L12 2Z" fill="#f0e68c"/>
              </svg>
          </div>`;

    return `
        <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}" style="animation-delay: ${index * 0.05}s">
            <div class="product-image-wrapper">
                ${imageHTML}
                ${product.featured ? '<span class="product-badge">Featured</span>' : ''}
                ${isOutOfStock ? '<span class="stock-badge out-of-stock-badge">Out of Stock</span>' : '<span class="stock-badge in-stock-badge">In Stock</span>'}
                <button class="wishlist-btn ${isWishlisted(product.id) ? 'active' : ''}" data-product-id="${product.id}" aria-label="Add to wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.99872 7.05 2.99872C5.59096 2.99872 4.19169 3.5783 3.16 4.61C2.1283 5.64169 1.54872 7.04096 1.54872 8.5C1.54872 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7563 5.72717 21.351 5.12084 20.84 4.61Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${formatCategory(product.category)}</p>
                <p class="product-price">BDT ${product.price.toLocaleString('en-BD')} each</p>
                <button class="btn btn-primary add-to-cart-btn ${isInCart || isOutOfStock ? 'in-cart' : ''}" data-product-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Out of Stock' : (isInCart ? 'In Cart' : 'Add to Cart')}
                </button>
                <div class="product-qty-control ${isInCart && !isOutOfStock ? 'show' : 'hidden'}" data-product-id="${product.id}">
                    <button class="qty-btn" data-action="decrement" data-product-id="${product.id}" aria-label="Decrease quantity">-</button>
                    <span class="qty-value" data-qty-for="${product.id}">${cartQuantity}</span>
                    <button class="qty-btn" data-action="increment" data-product-id="${product.id}" aria-label="Increase quantity">+</button>
                </div>
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
    const normalizedCategory = normalizeCategory(category);
    const categoryMap = {
        'rings': 'Rings',
        'necklaces': 'Necklaces',
        'earrings': 'Earrings',
        'bracelets': 'Bracelets',
        'setitems': 'Jewelry Sets',
        'bridal': 'Others'
    };
    return categoryMap[normalizedCategory] || category;
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
                
                // Scroll to products grid instead of top
                const productsGrid = document.getElementById('products-grid');
                if (productsGrid) {
                    const offset = 100; // Offset to show some context above
                    const elementPosition = productsGrid.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Attach product-specific event listeners
function attachProductListeners() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const productId = parseInt(e.target.dataset.productId);
            await addToCart(productId);
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

    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = Number(e.currentTarget.dataset.productId);
            const action = e.currentTarget.dataset.action;
            if (!productId || !action) return;
            const delta = action === 'increment' ? 1 : -1;
            await adjustCartQuantity(productId, delta);
        });
    });
}

// Resolve the maximum quantity allowed for a product based on stock.
function getMaxQuantity(product, existingItem = null) {
    const productStock = Number(product?.stock_quantity);
    const existingStock = Number(existingItem?.stock_quantity);

    if (Number.isFinite(productStock) && productStock > 0) return productStock;
    if (Number.isFinite(existingStock) && existingStock > 0) return existingStock;

    // Fallback ceiling to avoid unbounded growth when stock is unknown
    return 99;
}

function updateAddToCartButton(productId, quantity, maxQuantity) {
    const btn = document.querySelector(`.add-to-cart-btn[data-product-id="${productId}"]`);
    const qtyWrap = document.querySelector(`.product-qty-control[data-product-id="${productId}"]`);
    const qtyValue = document.querySelector(`.qty-value[data-qty-for="${productId}"]`);

    if (!btn) return;

    if (quantity > 0) {
        btn.textContent = 'In Cart';
        btn.classList.add('in-cart');
        btn.setAttribute('aria-pressed', 'true');
        if (qtyWrap) qtyWrap.classList.remove('hidden');
        if (qtyWrap) qtyWrap.classList.add('show');
        if (qtyValue) qtyValue.textContent = Math.min(quantity, maxQuantity);
    } else {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('in-cart');
        btn.removeAttribute('aria-pressed');
        if (qtyWrap) qtyWrap.classList.remove('show');
        if (qtyWrap) qtyWrap.classList.add('hidden');
        if (qtyValue) qtyValue.textContent = '0';
    }
}

// Adjust quantity with Supabase sync
async function adjustCartQuantity(productId, delta) {
    if (!currentUserId) {
        currentUserId = await getCurrentUserId();
    }

    if (!currentUserId) {
        showNotification('Please log in to manage your cart.', 'info');
        return;
    }

    const product = productsData.find(p => Number(p.id) === Number(productId));
    if (!product) return;

    const existingItem = cart.find(item => Number(item.id) === Number(productId));
    const maxQuantity = getMaxQuantity(product, existingItem);

    const currentQty = Math.max(0, Number(existingItem?.quantity || 0));
    const nextQty = Math.min(maxQuantity, currentQty + delta);

    if (nextQty <= 0) {
        cart = cart.filter(item => Number(item.id) !== Number(productId));
        scheduleCartSync(product, 0);
        persistCart();
        updateAddToCartButton(productId, 0, maxQuantity);
        showNotification('Removed from cart', 'info');
        return;
    }

    if (existingItem) {
        existingItem.quantity = nextQty;
        existingItem.stock_quantity = maxQuantity;
    } else {
        cart.push({ ...product, quantity: nextQty, stock_quantity: maxQuantity });
    }

    scheduleCartSync(product, nextQty);
    persistCart();
    updateAddToCartButton(productId, nextQty, maxQuantity);
    showNotification(delta > 0 ? 'Added to cart!' : 'Quantity updated', 'success');
}

// Add product to cart (single action; show controls if already present)
async function addToCart(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    if ((product.stock_status || '').toLowerCase() === 'out_of_stock') {
        showNotification('This item is out of stock.', 'info');
        return;
    }

    const existingItem = cart.find(item => Number(item.id) === Number(productId));
    if (existingItem) {
        const maxQuantity = getMaxQuantity(product, existingItem);
        const qty = Math.max(1, Math.min(maxQuantity, Number(existingItem.quantity || 1)));
        existingItem.quantity = qty;
        existingItem.stock_quantity = maxQuantity;
        scheduleCartSync(product, qty);
        persistCart();
        updateAddToCartButton(productId, qty, maxQuantity);
        return;
    }

    await adjustCartQuantity(productId, 1);
}

// Toggle wishlist
async function toggleWishlist(productId) {
    const normalizedId = Number(productId);
    const existingIndex = wishlist.findIndex(item => Number(item.id) === normalizedId);

    if (!currentUserId) {
        currentUserId = await getCurrentUserId();
    }

    if (!currentUserId) {
        showNotification('Please log in to use wishlist', 'error');
        return;
    }

    if (existingIndex >= 0) {
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', currentUserId)
            .eq('product_id', normalizedId);

        if (error) {
            showNotification('Could not remove from wishlist', 'error');
            return;
        }

        wishlist.splice(existingIndex, 1);
        document.querySelectorAll(`.wishlist-btn[data-product-id="${productId}"]`).forEach(btn => btn.classList.remove('active'));
        showNotification('Removed from wishlist!', 'info');
        return;
    }

    const product = productsData.find(p => Number(p.id) === normalizedId);
    if (!product) {
        showNotification('Could not add to wishlist', 'error');
        return;
    }

    const { error } = await supabase
        .from('wishlist')
        .insert({
            user_id: currentUserId,
            product_id: normalizedId
        });

    if (error) {
        if (error.code === '23505') {
            document.querySelectorAll(`.wishlist-btn[data-product-id="${productId}"]`).forEach(btn => btn.classList.add('active'));
            showNotification('Already in wishlist', 'info');
            return;
        }

        if (String(error.message || '').toLowerCase().includes('wishlist limit reached')) {
            showNotification('Wishlist limit reached. You can only add up to 5 items.', 'error');
            return;
        }

        showNotification('Could not add to wishlist', 'error');
        return;
    }

    wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url || product.image || '',
        category: product.category || '',
        stock_status: product.stock_status || 'in_stock'
    });

    document.querySelectorAll(`.wishlist-btn[data-product-id="${productId}"]`).forEach(btn => btn.classList.add('active'));
    showNotification('Added to wishlist!', 'info');
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
