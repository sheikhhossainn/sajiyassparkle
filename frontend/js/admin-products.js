import { supabase } from './supabase.js';

const state = {
    products: [],
    filteredProducts: [],
    currentPage: 1,
    itemsPerPage: 10,
    selectedProductIds: new Set(),
    pendingDeleteIds: [],
    selectedImageFile: null,
    stockColumn: 'stock_quantity',
    statusColumn: 'stock_status',
    featuredColumn: 'featured'
};

document.addEventListener('DOMContentLoaded', async () => {
    setupSidebarToggle();
    setupLogout();
    setupForm();
    setupFilters();
    setupPagination();
    setupSelectionControls();
    setupDeleteModal();

    const accessGranted = await ensureAdminAccess();
    if (!accessGranted) return;

    await detectProductColumns();
    await loadProducts();
});

async function ensureAdminAccess() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
        window.location.href = 'admin-login.html';
        return false;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (error || !profile?.is_admin) {
        alert('Access denied. Admin account required.');
        await supabase.auth.signOut();
        window.location.href = 'admin-login.html';
        return false;
    }

    return true;
}

function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.admin-sidebar');

    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });
}

function setupLogout() {
    const logoutLink = document.querySelector('.sidebar-logout');
    if (!logoutLink) return;

    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.warn('Admin logout signOut error:', error);
        } finally {
            window.location.href = '../index.html';
        }
    });
}

function setupForm() {
    const productForm = document.getElementById('productForm');
    const imageInput = document.getElementById('productImages');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    if (imageInput) {
        imageInput.addEventListener('change', handleImageInputChange);
    }

    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
        productForm.addEventListener('reset', () => {
            clearFormErrors();
            resetFormState();
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (productForm) productForm.reset();
            resetFormState();
            clearFormErrors();
        });
    }
}

function setupFilters() {
    const searchInput = document.getElementById('searchProducts');
    const categoryFilter = document.getElementById('filterCategory');

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
}

function setupPagination() {
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage -= 1;
                renderProductsTable();
            }
        });
    }

    if (nextPage) {
        nextPage.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(state.filteredProducts.length / state.itemsPerPage));
            if (state.currentPage < totalPages) {
                state.currentPage += 1;
                renderProductsTable();
            }
        });
    }
}

function setupSelectionControls() {
    const selectAllCheckbox = document.getElementById('selectAllProducts');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const visibleProducts = getPaginatedProducts();
            if (e.target.checked) {
                visibleProducts.forEach((product) => state.selectedProductIds.add(product.id));
            } else {
                visibleProducts.forEach((product) => state.selectedProductIds.delete(product.id));
            }
            renderProductsTable();
        });
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => {
            const ids = Array.from(state.selectedProductIds);
            if (ids.length === 0) return;
            openDeleteModal(ids);
        });
    }
}

function setupDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');

    if (cancelDelete) {
        cancelDelete.addEventListener('click', closeDeleteModal);
    }

    if (confirmDelete) {
        confirmDelete.addEventListener('click', handleConfirmDelete);
    }

    if (deleteModal) {
        const overlay = deleteModal.querySelector('.modal-overlay');
        if (overlay) overlay.addEventListener('click', closeDeleteModal);
    }
}

async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        alert('Failed to load products: ' + error.message);
        return;
    }

    state.products = data || [];
    state.selectedProductIds.clear();
    hydrateCategoryFilter(state.products);
    renderFeaturedManager();
    applyFilters();
}

async function detectProductColumns() {
    const stockCandidates = ['stock_quantity', 'stock'];
    const statusCandidates = ['stock_status', 'status'];
    const featuredCandidates = ['featured', 'is_featured'];

    state.stockColumn = await detectFirstExistingColumn(stockCandidates, '');
    state.statusColumn = await detectFirstExistingColumn(statusCandidates, '');
    state.featuredColumn = await detectFirstExistingColumn(featuredCandidates, '');
}

async function detectFirstExistingColumn(candidates, fallback) {
    for (const col of candidates) {
        const { error } = await supabase.from('products').select(col).limit(1);
        if (!error) return col;
        if (!String(error.message || '').includes('Could not find the')) {
            break;
        }
    }
    return fallback;
}

function hydrateCategoryFilter(products) {
    const filterSelect = document.getElementById('filterCategory');
    if (!filterSelect) return;

    const existingValue = filterSelect.value;
    const categories = Array.from(new Set((products || [])
        .map((item) => (item.category || '').trim())
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

    filterSelect.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filterSelect.appendChild(option);
    });

    if (existingValue && categories.includes(existingValue)) {
        filterSelect.value = existingValue;
    }
}

function applyFilters() {
    const searchTerm = (document.getElementById('searchProducts')?.value || '').trim().toLowerCase();
    const category = document.getElementById('filterCategory')?.value || '';

    state.filteredProducts = state.products.filter((product) => {
        const matchesSearch = product.name?.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || product.category === category;
        return matchesSearch && matchesCategory;
    });

    state.currentPage = 1;
    renderProductsTable();
}

function getPaginatedProducts() {
    const start = (state.currentPage - 1) * state.itemsPerPage;
    return state.filteredProducts.slice(start, start + state.itemsPerPage);
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const rows = getPaginatedProducts();
    tbody.innerHTML = '';

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: var(--spacing-xl); color: var(--color-neutral-medium);">
                    No products found
                </td>
            </tr>
        `;
        updateSelectionUI();
        updatePaginationUI();
        return;
    }

    rows.forEach((product) => {
        const row = document.createElement('tr');
        const imageUrl = product.image_url || 'https://placehold.co/80x80?text=No+Image';
        const status = product[state.statusColumn] || product.stock_status || product.status || 'Out of Stock';
        const price = Number(product.price || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 });
        const stockQty = Number(product[state.stockColumn] ?? product.stock_quantity ?? product.stock ?? 0);
        const stockClass = stockQty === 0 ? 'stock-low' : stockQty < 5 ? 'stock-medium' : 'stock-high';
        const isFeatured = Boolean(product[state.featuredColumn] ?? product.featured ?? product.is_featured ?? false);
        const isSelected = state.selectedProductIds.has(product.id);

        row.innerHTML = `
            <td>
                <input type="checkbox" class="product-select" data-id="${product.id}" ${isSelected ? 'checked' : ''} aria-label="Select product ${product.name}">
            </td>
            <td>
                <img src="${imageUrl}" alt="${product.name}" class="product-image">
            </td>
            <td>
                <div class="product-name">${escapeHtml(product.name || '')}</div>
            </td>
            <td>
                <span class="product-category">${escapeHtml(product.category || 'General')}</span>
            </td>
            <td>
                <span class="product-price">BDT ${price}</span>
            </td>
            <td>
                <span class="product-stock ${stockClass}">${stockQty}</span>
            </td>
            <td>
                <span class="status-badge ${status === 'In Stock' ? 'available' : 'out-of-stock'}">${escapeHtml(status)}</span>
            </td>
            <td>
                <span class="status-badge ${isFeatured ? 'available' : 'out-of-stock'}">${isFeatured ? 'Yes' : 'No'}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" data-action="edit" data-id="${product.id}">Edit</button>
                    <button class="action-btn edit" data-action="feature" data-id="${product.id}">${isFeatured ? 'Unfeature' : 'Feature'}</button>
                    <button class="action-btn delete" data-action="delete" data-id="${product.id}">Delete</button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });

    tbody.querySelectorAll('.product-select').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
            const id = Number(e.target.dataset.id);
            if (e.target.checked) {
                state.selectedProductIds.add(id);
            } else {
                state.selectedProductIds.delete(id);
            }
            updateSelectionUI();
        });
    });

    tbody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
        button.addEventListener('click', () => startEditProduct(Number(button.dataset.id)));
    });

    tbody.querySelectorAll('button[data-action="feature"]').forEach((button) => {
        button.addEventListener('click', () => toggleFeaturedStatus(Number(button.dataset.id)));
    });

    tbody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
        button.addEventListener('click', () => openDeleteModal([Number(button.dataset.id)]));
    });

    updateSelectionUI();
    updatePaginationUI();
}

function updateSelectionUI() {
    const visibleProducts = getPaginatedProducts();
    const selectedOnPage = visibleProducts.filter((p) => state.selectedProductIds.has(p.id)).length;

    const selectedCount = document.getElementById('selectedCount');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectAllCheckbox = document.getElementById('selectAllProducts');

    if (selectedCount) {
        selectedCount.textContent = String(state.selectedProductIds.size);
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = state.selectedProductIds.size === 0;
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = visibleProducts.length > 0 && selectedOnPage === visibleProducts.length;
        selectAllCheckbox.indeterminate = selectedOnPage > 0 && selectedOnPage < visibleProducts.length;
    }

    const featuredInfo = document.getElementById('featuredCountInfo');
    if (featuredInfo) {
        featuredInfo.textContent = `Featured on homepage: ${getFeaturedCount(null)}/4`;
    }

    const featuredManagerCount = document.getElementById('featuredManagerCount');
    if (featuredManagerCount) {
        featuredManagerCount.textContent = String(getFeaturedCount(null));
    }
}

function updatePaginationUI() {
    const totalPages = Math.max(1, Math.ceil(state.filteredProducts.length / state.itemsPerPage));

    const currentPage = document.getElementById('currentPage');
    const totalPagesEl = document.getElementById('totalPages');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    if (currentPage) currentPage.textContent = String(state.currentPage);
    if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
    if (prevPage) prevPage.disabled = state.currentPage <= 1;
    if (nextPage) nextPage.disabled = state.currentPage >= totalPages;
}

function handleImageInputChange(event) {
    const file = event.target.files?.[0] || null;
    state.selectedImageFile = file;

    const previewContainer = document.getElementById('imagePreviewContainer');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        event.target.value = '';
        state.selectedImageFile = null;
        alert('Please upload a valid image file.');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        event.target.value = '';
        state.selectedImageFile = null;
        alert('Image size must be 5MB or less.');
        return;
    }

    const imageUrl = URL.createObjectURL(file);
    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview';
    wrapper.innerHTML = `<img src="${imageUrl}" alt="Image preview">`;
    previewContainer.appendChild(wrapper);
}

async function handleProductSubmit(event) {
    event.preventDefault();
    clearFormErrors();

    const productId = Number(document.getElementById('productId')?.value || 0);
    const productName = document.getElementById('productName')?.value?.trim() || '';
    const category = document.getElementById('productCategory')?.value?.trim() || '';
    const priceValue = document.getElementById('productPrice')?.value || '';
    const stockStatus = document.getElementById('productStockStatus')?.value || '';
    const stockQty = document.getElementById('productStock')?.value || '';
    const productFeatured = document.getElementById('productFeatured')?.checked || false;
    const description = document.getElementById('productDescription')?.value?.trim() || null;
    const currentImageUrl = document.getElementById('currentImageUrl')?.value || '';

    let hasError = false;

    if (!productName) {
        showFieldError('productName', 'Product name is required');
        hasError = true;
    }

    if (!category) {
        showFieldError('productCategory', 'Category is required');
        hasError = true;
    }

    const price = Number(priceValue);
    if (!priceValue || Number.isNaN(price) || price < 0) {
        showFieldError('productPrice', 'Enter a valid price');
        hasError = true;
    }

    if (!stockStatus) {
        showFieldError('productStockStatus', 'Stock status is required');
        hasError = true;
    }

    const parsedStockQty = stockQty === '' ? 0 : Number(stockQty);
    if (Number.isNaN(parsedStockQty) || parsedStockQty < 0) {
        showFieldError('productStock', 'Enter a valid stock quantity');
        hasError = true;
    }

    const featuredCount = getFeaturedCount(productId || null);
    if (productFeatured && featuredCount >= 4) {
        alert('You can feature a maximum of 4 products on homepage.');
        hasError = true;
    }

    if (hasError) return;

    let imageUrl = currentImageUrl;

    if (state.selectedImageFile) {
        imageUrl = await uploadProductImage(state.selectedImageFile);
        if (!imageUrl) return;
    }

    if (!imageUrl) {
        alert('Please upload a product image.');
        return;
    }

    const payload = {
        name: productName,
        category,
        price,
        image_url: imageUrl,
        description,
        updated_at: new Date().toISOString()
    };

    if (state.statusColumn) {
        payload[state.statusColumn] = stockStatus;
    }
    if (state.stockColumn) {
        payload[state.stockColumn] = parsedStockQty;
    }
    if (state.featuredColumn) {
        payload[state.featuredColumn] = productFeatured;
    }

    const { error } = await saveProductPayload(payload, productId);

    if (error) {
        alert('Failed to save product: ' + error.message);
        return;
    }

    alert(productId ? 'Product updated successfully.' : 'Product added successfully.');

    const form = document.getElementById('productForm');
    if (form) form.reset();
    resetFormState();
    await loadProducts();
}

async function saveProductPayload(payload, productId) {
    let mutablePayload = { ...payload };

    if (!productId) {
        mutablePayload.created_at = new Date().toISOString();
    }

    // Retry saves by stripping unknown columns from payload to support evolving schemas.
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = productId
            ? await supabase.from('products').update(mutablePayload).eq('id', productId)
            : await supabase.from('products').insert([mutablePayload]);

        if (!result.error) return result;

        const message = String(result.error.message || '');
        const missingColumnMatch = message.match(/Could not find the '([^']+)' column/);
        const missingColumn = missingColumnMatch?.[1] || '';

        if (!missingColumn || !(missingColumn in mutablePayload)) {
            return result;
        }

        delete mutablePayload[missingColumn];

        if (missingColumn === state.stockColumn) {
            state.stockColumn = '';
        }
        if (missingColumn === state.statusColumn) {
            state.statusColumn = '';
        }
        if (missingColumn === state.featuredColumn) {
            state.featuredColumn = '';
        }
    }

    return { error: { message: 'Failed to save product due to schema mismatch.' } };
}

async function uploadProductImage(file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, { upsert: false });

    if (uploadError) {
        alert('Image upload failed: ' + uploadError.message);
        return '';
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data?.publicUrl || '';
}

function startEditProduct(productId) {
    const product = state.products.find((item) => Number(item.id) === Number(productId));
    if (!product) return;

    const form = document.getElementById('productForm');
    if (!form) return;

    document.getElementById('productId').value = String(product.id);
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productStockStatus').value = product[state.statusColumn] || product.stock_status || product.status || 'In Stock';
    document.getElementById('productStock').value = product[state.stockColumn] ?? product.stock_quantity ?? product.stock ?? 0;
    document.getElementById('productFeatured').checked = Boolean(product[state.featuredColumn] ?? product.featured ?? product.is_featured ?? false);
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('currentImageUrl').value = product.image_url || '';

    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        if (product.image_url) {
            const wrapper = document.createElement('div');
            wrapper.className = 'image-preview';
            wrapper.innerHTML = `<img src="${product.image_url}" alt="Current product image">`;
            previewContainer.appendChild(wrapper);
        }
    }

    const saveBtn = document.getElementById('saveProductBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (saveBtn) saveBtn.textContent = 'Update Product';
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline-flex';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormState() {
    state.selectedImageFile = null;

    const imageInput = document.getElementById('productImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const productId = document.getElementById('productId');
    const currentImageUrl = document.getElementById('currentImageUrl');
    const productFeatured = document.getElementById('productFeatured');
    const saveBtn = document.getElementById('saveProductBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    if (imageInput) imageInput.value = '';
    if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
    if (productId) productId.value = '';
    if (currentImageUrl) currentImageUrl.value = '';
    if (productFeatured) productFeatured.checked = false;
    if (saveBtn) saveBtn.textContent = 'Save Product';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
}

function getFeaturedCount(excludeProductId) {
    return state.products.filter((product) => {
        if (excludeProductId && Number(product.id) === Number(excludeProductId)) {
            return false;
        }

        return Boolean(product[state.featuredColumn] ?? product.featured ?? product.is_featured ?? false);
    }).length;
}

function openDeleteModal(ids) {
    state.pendingDeleteIds = ids;

    const deleteModal = document.getElementById('deleteModal');
    const modalBody = deleteModal?.querySelector('.modal-body p');

    if (modalBody) {
        if (ids.length === 1) {
            modalBody.textContent = 'Are you sure you want to delete this product? This action cannot be undone.';
        } else {
            modalBody.textContent = `Are you sure you want to delete ${ids.length} selected products? This action cannot be undone.`;
        }
    }

    if (deleteModal) deleteModal.style.display = 'block';
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.style.display = 'none';
    state.pendingDeleteIds = [];
}

async function handleConfirmDelete() {
    if (state.pendingDeleteIds.length === 0) return;

    const { error } = await supabase
        .from('products')
        .delete()
        .in('id', state.pendingDeleteIds);

    if (error) {
        alert('Failed to delete products: ' + error.message);
        return;
    }

    state.pendingDeleteIds.forEach((id) => state.selectedProductIds.delete(id));
    closeDeleteModal();
    await loadProducts();
}

async function toggleFeaturedStatus(productId) {
    const product = state.products.find((item) => Number(item.id) === Number(productId));
    if (!product) return;

    const currentValue = Boolean(product[state.featuredColumn] ?? product.featured ?? product.is_featured ?? false);
    await setFeaturedStatus(productId, !currentValue);
}

function renderFeaturedManager() {
    const container = document.getElementById('featuredManagerList');
    if (!container) return;

    const featuredProducts = state.products.filter((product) =>
        Boolean(product[state.featuredColumn] ?? product.featured ?? product.is_featured ?? false)
    );

    const featuredManagerCount = document.getElementById('featuredManagerCount');
    if (featuredManagerCount) {
        featuredManagerCount.textContent = String(featuredProducts.length);
    }

    if (featuredProducts.length === 0) {
        container.innerHTML = '<p class="card-subtitle">No featured products selected yet.</p>';
        return;
    }

    container.innerHTML = featuredProducts.map((product) => {
        const imageUrl = product.image_url || 'https://placehold.co/80x80?text=No+Image';
        return `
            <div class="featured-manager-item">
                <div class="featured-manager-meta">
                    <img src="${imageUrl}" class="featured-manager-thumb" alt="${escapeHtml(product.name || 'Product')}">
                    <div>
                        <div class="product-name">${escapeHtml(product.name || 'Unnamed product')}</div>
                        <div class="card-subtitle">${escapeHtml(product.category || 'General')}</div>
                    </div>
                </div>
                <button class="action-btn delete" data-action="remove-featured" data-id="${product.id}">Remove</button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('button[data-action="remove-featured"]').forEach((button) => {
        button.addEventListener('click', () => setFeaturedStatus(Number(button.dataset.id), false));
    });
}

async function setFeaturedStatus(productId, nextValue) {
    const product = state.products.find((item) => Number(item.id) === Number(productId));
    if (!product) return;

    if (!state.featuredColumn) {
        alert('Featured column is not available in your products table yet.');
        return;
    }

    if (nextValue && getFeaturedCount(productId) >= 4) {
        alert('You can feature a maximum of 4 products on homepage.');
        return;
    }

    const payload = { [state.featuredColumn]: nextValue };
    const { error } = await saveProductPayload(payload, productId);

    if (error) {
        alert('Failed to update featured status: ' + error.message);
        return;
    }

    await loadProducts();
}

function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    const inputEl = document.getElementById(fieldId);

    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }

    if (inputEl) {
        inputEl.style.borderColor = '#dc2626';
    }
}

function clearFormErrors() {
    const errorEls = document.querySelectorAll('.form-error');
    const inputEls = document.querySelectorAll('.form-input');

    errorEls.forEach((el) => {
        el.textContent = '';
        el.classList.remove('show');
    });

    inputEls.forEach((el) => {
        el.style.borderColor = '';
    });
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
