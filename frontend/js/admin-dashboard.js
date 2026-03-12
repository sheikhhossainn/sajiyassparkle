import { supabase } from './supabase.js';

// ============================================
// Product Management State
// ============================================
let allProducts = [];
let filteredProducts = [];
let currentEditingProductId = null;
let productToDeleteId = null;

// ============================================
// Initialize on DOM Load
// ============================================
document.addEventListener('DOMContentLoaded', initializeDashboard);

async function initializeDashboard() {
    console.log('Initializing Admin Dashboard...');
    
    try {
        // Setup all event listeners first
        setupAllEventListeners();
        
        // Then load products
        await loadProducts();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// ============================================
// Setup All Event Listeners
// ============================================
function setupAllEventListeners() {
    // Dark Mode Toggle
    setupDarkModeToggle();
    
    // Product Management
    setupAddProductButton();
    setupSearchInput();
    setupProductImagePreview();
    setupProductFormSubmit();
    setupModalCloseButtons();
    setupDeleteConfirmButton();
    setupModalBackdropClose();
    
    // Quick Actions
    setupQuickActionCards();
    
    // Orders Table
    setupOrdersTable();
    
    // Logout
    setupLogout();
    
    console.log('All event listeners setup complete');
}

// ============================================
// Dark Mode Toggle
// ============================================
function setupDarkModeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.icon-sun');
    const moonIcon = document.querySelector('.icon-moon');
    
    if (!themeToggle) return;
    
    // Check for saved theme preference
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    }
    
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
            localStorage.setItem('theme', 'dark');
        } else {
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
            localStorage.setItem('theme', 'light');
        }
    });
}

// ============================================
// Product Management - Add Button
// ============================================
function setupAddProductButton() {
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            console.log('Add Product button clicked');
            openAddProductModal();
        });
    }
}

// ============================================
// Product Management - Search
// ============================================
function setupSearchInput() {
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            console.log('Search term:', searchTerm);
            
            if (searchTerm === '') {
                filteredProducts = [...allProducts];
            } else {
                filteredProducts = allProducts.filter(product => 
                    product.name.toLowerCase().includes(searchTerm)
                );
            }
            
            console.log('Filtered products:', filteredProducts.length);
            renderProducts(filteredProducts);
        });
    }
}

// ============================================
// Product Management - Image Preview
// ============================================
function setupProductImagePreview() {
    const productImageInput = document.getElementById('productImage');
    if (productImageInput) {
        productImageInput.addEventListener('input', function() {
            console.log('Image URL input changed:', this.value);
            handleImagePreview(this.value);
        });
    }
}

// ============================================
// Product Management - Form Submit
// ============================================
function setupProductFormSubmit() {
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductFormSubmit);
    }
}

// ============================================
// Modal - Close Buttons
// ============================================
function setupModalCloseButtons() {
    const closeButtons = document.querySelectorAll('.modal-close, .modal-close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });
}

// ============================================
// Modal - Delete Confirm Button
// ============================================
function setupDeleteConfirmButton() {
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteProduct);
    }
}

// ============================================
// Modal - Backdrop Close
// ============================================
function setupModalBackdropClose() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });
}

// ============================================
// Quick Action Cards
// ============================================
function setupQuickActionCards() {
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const actionTitle = this.querySelector('h3')?.textContent || '';
            console.log('Action clicked:', actionTitle);
            
            if (actionTitle.includes('Add New Product')) {
                openAddProductModal();
            } else {
                alert(`Action: ${actionTitle}\n\nThis would navigate to the ${actionTitle.toLowerCase()} page.`);
            }
        });
    });
}

// ============================================
// Orders Table
// ============================================
function setupOrdersTable() {
    const tableRows = document.querySelectorAll('.orders-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('click', function(e) {
            if (!e.target.closest('.btn-action')) {
                tableRows.forEach(r => r.style.backgroundColor = '');
                this.style.backgroundColor = 'var(--color-neutral-light)';
            }
        });
    });
    
    const viewButtons = document.querySelectorAll('.btn-action');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const orderId = row?.querySelector('td:first-child')?.textContent || 'Unknown';
            console.log('View order:', orderId);
            alert(`Opening order details for ${orderId}`);
        });
    });
}

// ============================================
// Logout
// ============================================
function setupLogout() {
    const logoutLink = document.querySelector('a[href*="admin-login"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'admin-login.html#-Sa7iyA';
            }
        });
    }
}

// ============================================
// Load Products from Database
// ============================================
async function loadProducts() {
    try {
        console.log('Loading products from Supabase...');
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading products:', error);
            showNotification(`Error loading products: ${error.message}`, 'error');
            allProducts = [];
        } else {
            allProducts = data || [];
            console.log('Loaded products:', allProducts.length);
        }
        
        filteredProducts = [...allProducts];
        renderProducts(filteredProducts);
        
    } catch (error) {
        console.error('Exception in loadProducts:', error);
        showNotification('Failed to load products: ' + error.message, 'error');
        allProducts = [];
        filteredProducts = [];
        renderProducts([]);
    }
}

// ============================================
// Render Products
// ============================================
function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    
    if (!container) {
        console.error('Products container not found!');
        return;
    }
    
    console.log('Rendering', products.length, 'products');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="no-products" style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--color-neutral-medium);"><p>No products found</p></div>';
        return;
    }

    container.innerHTML = products.map(product => {
        const stockClass = product.stock_status === 'In Stock' ? 'stock-high' : 'stock-low';
        const stockText = product.stock_quantity ? `${product.stock_status}: ${product.stock_quantity}` : product.stock_status;
        const imageUrl = product.image_url || 'https://placehold.co/400x300?text=No+Image';
        const price = parseFloat(product.price || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        
        return `
            <div class="product-card">
                <div class="product-card-image">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                </div>
                <div class="product-card-content">
                    <h3 class="product-card-title">${product.name}</h3>
                    <p class="product-card-price">BDT ${price}</p>
                    <div class="product-card-actions">
                        <button class="btn btn-secondary btn-sm edit-product-btn" data-id="${product.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-product-btn" data-id="${product.id}">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners to dynamically created buttons
    attachProductCardListeners();
}

// ============================================
// Attach Product Card Listeners
// ============================================
function attachProductCardListeners() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    container.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = parseInt(this.dataset.id);
            console.log('Edit product ID:', productId);
            openEditProductModal(productId);
        });
    });

    container.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = parseInt(this.dataset.id);
            console.log('Delete product ID:', productId);
            openDeleteModal(productId);
        });
    });
}

// ============================================
// Open Add Product Modal
// ============================================
function openAddProductModal() {
    console.log('Opening Add Product modal');
    resetProductForm();
    currentEditingProductId = null;
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Add New Product';
    
    const productIdInput = document.getElementById('productId');
    if (productIdInput) productIdInput.value = '';
    
    openModal('productModal');
}

// ============================================
// Open Edit Product Modal
// ============================================
function openEditProductModal(productId) {
    console.log('Opening Edit Product modal for ID:', productId);
    
    const product = allProducts.find(p => parseInt(p.id) === parseInt(productId));
    
    if (!product) {
        console.error('Product not found with ID:', productId);
        showNotification('Product not found', 'error');
        return;
    }

    try {
        currentEditingProductId = productId;
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Edit Product';
        
        const productIdInput = document.getElementById('productId');
        if (productIdInput) productIdInput.value = productId;
        
        const productName = document.getElementById('productName');
        if (productName) productName.value = product.name || '';
        
        const productCategory = document.getElementById('productCategory');
        if (productCategory) productCategory.value = product.category || '';
        
        const productPrice = document.getElementById('productPrice');
        if (productPrice) productPrice.value = product.price || '';
        
        const productImage = document.getElementById('productImage');
        if (productImage) productImage.value = product.image_url || '';
        
        const stockStatus = document.getElementById('stockStatus');
        if (stockStatus) stockStatus.value = product.stock_status || '';
        
        const stockQuantity = document.getElementById('stockQuantity');
        if (stockQuantity) stockQuantity.value = product.stock_quantity || '';

        // Show image preview
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview && product.image_url) {
            imagePreview.innerHTML = `<img src="${product.image_url}" alt="Preview" onerror="this.src='https://placehold.co/400x300?text=Error+Loading'">`;
        }

        openModal('productModal');
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showNotification('Error loading product details', 'error');
    }
}

// ============================================
// Open Delete Modal
// ============================================
function openDeleteModal(productId) {
    console.log('Opening Delete modal for ID:', productId);
    
    const product = allProducts.find(p => parseInt(p.id) === parseInt(productId));
    
    if (!product) {
        console.error('Product not found with ID:', productId);
        showNotification('Product not found', 'error');
        return;
    }

    productToDeleteId = productId;
    
    const deleteProductName = document.getElementById('deleteProductName');
    if (deleteProductName) deleteProductName.textContent = product.name;
    
    openModal('deleteModal');
}

// ============================================
// Handle Product Form Submit
// ============================================
async function handleProductFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted');

    const productId = document.getElementById('productId')?.value || '';
    const productName = document.getElementById('productName')?.value || '';
    const productCategory = document.getElementById('productCategory')?.value || 'General';
    const productPrice = document.getElementById('productPrice')?.value || '';
    const productImage = document.getElementById('productImage')?.value || '';
    const stockStatus = document.getElementById('stockStatus')?.value || '';
    const stockQuantity = document.getElementById('stockQuantity')?.value || '';

    if (!productName.trim() || !productPrice || !productImage.trim() || !stockStatus) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const productData = {
            name: productName.trim(),
            category: productCategory.trim(),
            price: parseFloat(productPrice),
            image_url: productImage.trim(),
            stock_status: stockStatus,
            stock_quantity: stockQuantity ? parseInt(stockQuantity) : null,
            updated_at: new Date().toISOString()
        };

        if (productId) {
            // Update existing product
            console.log('Updating product ID:', productId);
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', parseInt(productId));

            if (error) {
                console.error('Error updating product:', error);
                showNotification(`Error updating product: ${error.message}`, 'error');
                return;
            }

            showNotification('Product updated successfully', 'success');
        } else {
            // Add new product
            console.log('Adding new product');
            productData.created_at = new Date().toISOString();
            
            const { error } = await supabase
                .from('products')
                .insert([productData]);

            if (error) {
                console.error('Error adding product:', error);
                showNotification(`Error adding product: ${error.message}`, 'error');
                return;
            }

            showNotification('Product added successfully', 'success');
        }

        closeModal(document.getElementById('productModal'));
        await loadProducts();
        
        const searchInput = document.getElementById('productSearch');
        if (searchInput) searchInput.value = '';
        
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Failed to save product: ' + error.message, 'error');
    }
}

// ============================================
// Handle Delete Product
// ============================================
async function handleDeleteProduct() {
    if (!productToDeleteId) {
        console.error('No product ID selected for deletion');
        return;
    }

    try {
        console.log('Deleting product ID:', productToDeleteId);
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', parseInt(productToDeleteId));

        if (error) {
            console.error('Error deleting product:', error);
            showNotification(`Error deleting product: ${error.message}`, 'error');
            return;
        }

        showNotification('Product deleted successfully', 'success');
        closeModal(document.getElementById('deleteModal'));
        productToDeleteId = null;
        await loadProducts();
    } catch (error) {
        console.error('Error in handleDeleteProduct:', error);
        showNotification('Failed to delete product: ' + error.message, 'error');
    }
}

// ============================================
// Handle Image Preview
// ============================================
function handleImagePreview(imageUrl) {
    const imagePreview = document.getElementById('imagePreview');
    
    if (!imagePreview) return;
    
    if (!imageUrl || imageUrl.trim() === '') {
        imagePreview.innerHTML = '';
        return;
    }

    imagePreview.innerHTML = `
        <img src="${imageUrl}" 
             alt="Preview" 
             onerror="this.src='https://placehold.co/400x300?text=Invalid+URL'"
             style="max-width: 100%; max-height: 300px; object-fit: contain;">
    `;
}

// ============================================
// Reset Product Form
// ============================================
function resetProductForm() {
    const productForm = document.getElementById('productForm');
    if (productForm) productForm.reset();
    
    const productIdInput = document.getElementById('productId');
    if (productIdInput) productIdInput.value = '';
    
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) imagePreview.innerHTML = '';
    
    currentEditingProductId = null;
}

// ============================================
// Open Modal
// ============================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        console.log('Modal opened:', modalId);
    }
}

// ============================================
// Close Modal
// ============================================
function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        console.log('Modal closed');
    }
}

// ============================================
// Show Notification
// ============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const bgColor = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background-color: ${bgColor};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease-out;
        font-size: 14px;
        max-width: 90%;
    `;

    document.body.appendChild(notification);
    console.log(`Notification: ${type} - ${message}`);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
