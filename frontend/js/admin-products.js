// ============================================
// Admin Product Management
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('Admin Products initialized');

    // ============================================
    // Dark Mode Toggle
    // ============================================

    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.icon-sun');
    const moonIcon = document.querySelector('.icon-moon');

    // Check saved theme
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            document.body.classList.toggle('dark-mode');

            if (document.body.classList.contains('dark-mode')) {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
                localStorage.setItem('theme', 'dark');
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // ============================================
    // Mobile Menu Toggle
    // ============================================

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.admin-sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('show');
        });
    }

    // ============================================
    // Product Status Toggle
    // ============================================

    const productStatus = document.getElementById('productStatus');
    const statusLabel = document.getElementById('statusLabel');

    if (productStatus && statusLabel) {
        productStatus.addEventListener('change', function () {
            statusLabel.textContent = this.checked ? 'Available' : 'Out of Stock';
        });
    }

    // ============================================
    // Multiple Image Upload with Preview
    // ============================================

    const productImages = document.getElementById('productImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    let uploadedImages = [];

    if (productImages) {
        productImages.addEventListener('change', function (e) {
            const files = Array.from(e.target.files);

            files.forEach((file, index) => {
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();

                    reader.onload = function (e) {
                        const imageData = {
                            id: Date.now() + index,
                            url: e.target.result,
                            file: file
                        };

                        uploadedImages.push(imageData);
                        displayImagePreview(imageData);
                    };

                    reader.readAsDataURL(file);
                }
            });

            // Reset input
            productImages.value = '';
        });
    }

    function displayImagePreview(imageData) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview';
        previewDiv.dataset.imageId = imageData.id;

        previewDiv.innerHTML = `
            <img src="${imageData.url}" alt="Product preview">
            <button type="button" class="image-preview-remove" onclick="removeImage(${imageData.id})">×</button>
        `;

        imagePreviewContainer.appendChild(previewDiv);
    }

    window.removeImage = function (imageId) {
        uploadedImages = uploadedImages.filter(img => img.id !== imageId);
        const previewElement = document.querySelector(`[data-image-id="${imageId}"]`);
        if (previewElement) {
            previewElement.remove();
        }
    };

    // ============================================
    // Form Validation
    // ============================================

    const productForm = document.getElementById('productForm');

    function showError(inputId, message) {
        const errorElement = document.getElementById(inputId + 'Error');
        const inputElement = document.getElementById(inputId);

        if (errorElement && inputElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            inputElement.style.borderColor = '#dc2626';
        }
    }

    function hideError(inputId) {
        const errorElement = document.getElementById(inputId + 'Error');
        const inputElement = document.getElementById(inputId);

        if (errorElement && inputElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
            inputElement.style.borderColor = '';
        }
    }

    function validateForm() {
        let isValid = true;

        // Product Name
        const productName = document.getElementById('productName').value.trim();
        if (!productName) {
            showError('productName', 'Product name is required');
            isValid = false;
        } else {
            hideError('productName');
        }

        // Category
        const productCategory = document.getElementById('productCategory').value;
        if (!productCategory) {
            showError('productCategory', 'Please select a category');
            isValid = false;
        } else {
            hideError('productCategory');
        }

        // Price
        const productPrice = document.getElementById('productPrice').value;
        if (!productPrice || parseFloat(productPrice) <= 0) {
            showError('productPrice', 'Please enter a valid price');
            isValid = false;
        } else {
            hideError('productPrice');
        }

        // Material
        const productMaterial = document.getElementById('productMaterial').value;
        if (!productMaterial) {
            showError('productMaterial', 'Please select a material');
            isValid = false;
        } else {
            hideError('productMaterial');
        }

        // Stock
        const productStock = document.getElementById('productStock').value;
        if (!productStock || parseInt(productStock) < 0) {
            showError('productStock', 'Please enter a valid stock quantity');
            isValid = false;
        } else {
            hideError('productStock');
        }

        // Discount validation (optional but if entered, must be valid)
        const productDiscount = document.getElementById('productDiscount').value;
        if (productDiscount && (parseFloat(productDiscount) < 0 || parseFloat(productDiscount) > 100)) {
            showError('productDiscount', 'Discount must be between 0 and 100');
            isValid = false;
        } else {
            hideError('productDiscount');
        }

        return isValid;
    }

    // ============================================
    // Form Submission
    // ============================================

    if (productForm) {
        productForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                return;
            }

            const formData = {
                name: document.getElementById('productName').value.trim(),
                category: document.getElementById('productCategory').value,
                price: parseFloat(document.getElementById('productPrice').value),
                discount: parseFloat(document.getElementById('productDiscount').value) || 0,
                description: document.getElementById('productDescription').value.trim(),
                material: document.getElementById('productMaterial').value,
                weight: parseFloat(document.getElementById('productWeight').value) || 0,
                stock: parseInt(document.getElementById('productStock').value),
                status: document.getElementById('productStatus').checked ? 'available' : 'out-of-stock',
                images: uploadedImages
            };

            console.log('Product Data:', formData);

            // TODO: Send to backend API
            // Example:
            // fetch('/api/products', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(formData)
            // })
            // .then(response => response.json())
            // .then(data => {
            //     console.log('Success:', data);
            //     addProductToTable(data);
            //     productForm.reset();
            //     uploadedImages = [];
            //     imagePreviewContainer.innerHTML = '';
            // })
            // .catch(error => console.error('Error:', error));

            // For demo: Add to table directly
            addProductToTable({
                id: Date.now(),
                ...formData
            });

            // Reset form
            productForm.reset();
            uploadedImages = [];
            imagePreviewContainer.innerHTML = '';
            statusLabel.textContent = 'Available';

            alert('Product added successfully!');
        });

        // Reset form
        productForm.addEventListener('reset', function () {
            uploadedImages = [];
            imagePreviewContainer.innerHTML = '';
            statusLabel.textContent = 'Available';
            // Clear all errors
            ['productName', 'productCategory', 'productPrice', 'productDiscount', 'productDescription', 'productMaterial', 'productWeight', 'productStock'].forEach(hideError);
        });
    }

    // ============================================
    // Products Data Management
    // ============================================

    let products = [
        {
            id: 1,
            name: 'Diamond Necklace',
            category: 'necklaces',
            material: 'diamond',
            price: 125000,
            discount: 10,
            stock: 5,
            status: 'available',
            images: [{ url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&q=80' }]
        },
        {
            id: 2,
            name: 'Gold Ring',
            category: 'rings',
            material: 'gold',
            price: 45000,
            discount: 0,
            stock: 12,
            status: 'available',
            images: [{ url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&q=80' }]
        },
        {
            id: 3,
            name: 'Pearl Earrings',
            category: 'earrings',
            material: 'silver',
            price: 8500,
            discount: 15,
            stock: 2,
            status: 'available',
            images: [{ url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&q=80' }]
        },
        {
            id: 4,
            name: 'Platinum Bracelet',
            category: 'bracelets',
            material: 'platinum',
            price: 95000,
            discount: 5,
            stock: 0,
            status: 'out-of-stock',
            images: [{ url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&q=80' }]
        },
        {
            id: 5,
            name: 'Gold Bangles',
            category: 'bangles',
            material: 'gold',
            price: 65000,
            discount: 0,
            stock: 8,
            status: 'available',
            images: [{ url: 'https://images.unsplash.com/photo-1610652492800-6fd11c7cf3b8?w=200&q=80' }]
        }
    ];

    let filteredProducts = [...products];
    let currentPage = 1;
    const itemsPerPage = 10;

    // ============================================
    // Render Products Table
    // ============================================

    function renderProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        if (paginatedProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: var(--spacing-xl); color: var(--color-neutral-medium);">
                        No products found
                    </td>
                </tr>
            `;
            return;
        }

        paginatedProducts.forEach(product => {
            const row = document.createElement('tr');

            const imageUrl = product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/50';
            
            const stockClass = product.stock === 0 ? 'stock-low' : product.stock < 5 ? 'stock-medium' : 'stock-high';
            
            const finalPrice = product.discount > 0 
                ? product.price - (product.price * product.discount / 100)
                : product.price;

            row.innerHTML = `
                <td>
                    <img src="${imageUrl}" alt="${product.name}" class="product-image">
                </td>
                <td>
                    <div class="product-name">${product.name}</div>
                </td>
                <td>
                    <span class="product-category">${product.category}</span>
                </td>
                <td>
                    <span class="product-material">${product.material}</span>
                </td>
                <td>
                    <span class="product-price">BDT ${finalPrice.toLocaleString('en-BD')}</span>
                    ${product.discount > 0 ? `<span class="product-discount">${product.discount}% off</span>` : ''}
                </td>
                <td>
                    <span class="product-stock ${stockClass}">${product.stock}</span>
                </td>
                <td>
                    <span class="status-badge ${product.status}">${product.status === 'available' ? 'Available' : 'Out of Stock'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editProduct(${product.id})">Edit</button>
                        <button class="action-btn delete" onclick="deleteProduct(${product.id})">Delete</button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });

        updatePagination();
    }

    function addProductToTable(product) {
        products.unshift(product);
        filteredProducts = [...products];
        currentPage = 1;
        renderProductsTable();
    }

    // ============================================
    // Edit Product
    // ============================================

    window.editProduct = function (productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Populate form with product data
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDiscount').value = product.discount || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productMaterial').value = product.material;
        document.getElementById('productWeight').value = product.weight || '';
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productStatus').checked = product.status === 'available';
        statusLabel.textContent = product.status === 'available' ? 'Available' : 'Out of Stock';

        // Show images if available
        if (product.images && product.images.length > 0) {
            uploadedImages = product.images.map((img, index) => ({
                id: Date.now() + index,
                url: img.url,
                file: null
            }));
            
            imagePreviewContainer.innerHTML = '';
            uploadedImages.forEach(img => displayImagePreview(img));
        }

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // TODO: Update form submission to handle edit mode
        console.log('Editing product:', product);
    };

    // ============================================
    // Delete Product
    // ============================================

    let productToDelete = null;
    const deleteModal = document.getElementById('deleteModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');

    window.deleteProduct = function (productId) {
        productToDelete = productId;
        deleteModal.style.display = 'block';
    };

    if (cancelDelete) {
        cancelDelete.addEventListener('click', function () {
            deleteModal.style.display = 'none';
            productToDelete = null;
        });
    }

    if (confirmDelete) {
        confirmDelete.addEventListener('click', function () {
            if (productToDelete) {
                // TODO: Send delete request to backend
                // fetch(`/api/products/${productToDelete}`, { method: 'DELETE' })
                //     .then(() => {
                //         products = products.filter(p => p.id !== productToDelete);
                //         filteredProducts = [...products];
                //         renderProductsTable();
                //     });

                // For demo: Remove from array
                products = products.filter(p => p.id !== productToDelete);
                filteredProducts = [...products];
                renderProductsTable();

                deleteModal.style.display = 'none';
                productToDelete = null;
                alert('Product deleted successfully!');
            }
        });
    }

    // Close modal on overlay click
    if (deleteModal) {
        deleteModal.querySelector('.modal-overlay')?.addEventListener('click', function () {
            deleteModal.style.display = 'none';
            productToDelete = null;
        });
    }

    // ============================================
    // Search Products
    // ============================================

    const searchProducts = document.getElementById('searchProducts');

    if (searchProducts) {
        searchProducts.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            filterProducts(searchTerm, document.getElementById('filterCategory').value);
        });
    }

    // ============================================
    // Filter by Category
    // ============================================

    const filterCategory = document.getElementById('filterCategory');

    if (filterCategory) {
        filterCategory.addEventListener('change', function (e) {
            const selectedCategory = e.target.value;
            filterProducts(searchProducts.value.toLowerCase(), selectedCategory);
        });
    }

    function filterProducts(searchTerm, category) {
        filteredProducts = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                product.material.toLowerCase().includes(searchTerm);
            const matchesCategory = !category || product.category === category;
            return matchesSearch && matchesCategory;
        });

        currentPage = 1;
        renderProductsTable();
    }

    // ============================================
    // Pagination
    // ============================================

    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    if (prevPage) {
        prevPage.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                renderProductsTable();
            }
        });
    }

    if (nextPage) {
        nextPage.addEventListener('click', function () {
            const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderProductsTable();
            }
        });
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
        
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;

        if (prevPage) {
            prevPage.disabled = currentPage === 1;
        }

        if (nextPage) {
            nextPage.disabled = currentPage === totalPages;
        }
    }

    // ============================================
    // Initialize
    // ============================================

    renderProductsTable();
});
