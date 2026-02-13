// ============================================
// Admin Category Management
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('Admin Categories initialized');

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

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 968) {
            if (sidebar && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });

    // ============================================
    // Image Upload & Preview
    // ============================================

    const categoryImage = document.getElementById('categoryImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeImage = document.getElementById('removeImage');

    categoryImage.addEventListener('change', function (e) {
        const file = e.target.files[0];

        if (file) {
            // Validate file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                alert('File size must be less than 2MB');
                categoryImage.value = '';
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                categoryImage.value = '';
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    removeImage.addEventListener('click', function () {
        categoryImage.value = '';
        imagePreview.style.display = 'none';
        previewImg.src = '';
    });

    // ============================================
    // Toggle Switch Status Text
    // ============================================

    const categoryStatus = document.getElementById('categoryStatus');
    const toggleText = document.querySelector('.toggle-text');

    categoryStatus.addEventListener('change', function () {
        toggleText.textContent = this.checked ? 'Active' : 'Inactive';
    });

    // ============================================
    // Form Validation & Submission
    // ============================================

    const categoryForm = document.getElementById('categoryForm');
    const categoryName = document.getElementById('categoryName');
    const categoryNameError = document.getElementById('categoryNameError');

    function showError(element, message) {
        element.textContent = message;
        element.classList.add('show');
    }

    function hideError(element) {
        element.textContent = '';
        element.classList.remove('show');
    }

    // Real-time validation
    categoryName.addEventListener('input', function () {
        if (this.value.trim()) {
            hideError(categoryNameError);
            this.style.borderColor = '';
        }
    });

    // Form submission
    categoryForm.addEventListener('submit', function (e) {
        e.preventDefault();

        let isValid = true;

        // Validate category name
        if (!categoryName.value.trim()) {
            showError(categoryNameError, 'Category name is required');
            categoryName.style.borderColor = '#dc2626';
            isValid = false;
        } else {
            hideError(categoryNameError);
            categoryName.style.borderColor = '';
        }

        if (isValid) {
            // Collect form data
            const formData = {
                name: categoryName.value.trim(),
                description: document.getElementById('categoryDescription').value.trim(),
                status: categoryStatus.checked ? 'Active' : 'Inactive',
                image: categoryImage.files[0] || null
            };

            console.log('Category data:', formData);

            // Here you would send to backend API
            // fetch('/api/categories', { method: 'POST', body: formData })

            // Add to table (demo)
            addCategoryToTable(formData);

            // Reset form
            categoryForm.reset();
            imagePreview.style.display = 'none';
            toggleText.textContent = 'Active';

            // Success message
            alert('Category added successfully!');
        }
    });

    // ============================================
    // Add Category to Table
    // ============================================

    function addCategoryToTable(data) {
        const tableBody = document.getElementById('categoriesTableBody');
        const newRow = document.createElement('tr');

        const imageUrl = data.image
            ? URL.createObjectURL(data.image)
            : 'https://placehold.co/60x60/f5f5f5/d4af37?text=' + data.name.charAt(0);
        const badgeClass = data.status === 'Active' ? 'badge-active' : 'badge-inactive';
        const rowId = Date.now();

        newRow.innerHTML = `
            <td>
                <div class="table-image">
                    <img src="${imageUrl}" alt="${data.name}">
                </div>
            </td>
            <td><strong>${data.name}</strong></td>
            <td>${data.description || '-'}</td>
            <td><span class="badge ${badgeClass}">${data.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" data-id="${rowId}" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${rowId}" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        tableBody.insertBefore(newRow, tableBody.firstChild);

        // Attach event listeners
        attachActionListeners(newRow);
    }

    // ============================================
    // Edit & Delete Actions
    // ============================================

    function attachActionListeners(row) {
        const editBtn = row.querySelector('.btn-edit');
        const deleteBtn = row.querySelector('.btn-delete');

        if (editBtn) {
            editBtn.addEventListener('click', handleEdit);
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDelete);
        }
    }

    // Attach to existing rows
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', handleEdit);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });

    function handleEdit(e) {
        const categoryId = this.getAttribute('data-id');
        const row = this.closest('tr');

        const name = row.querySelector('td:nth-child(2)').textContent.trim();
        const desc = row.querySelector('td:nth-child(3)').textContent.trim();
        const badge = row.querySelector('.badge');
        const isActive = badge.classList.contains('badge-active');

        console.log('Edit category:', categoryId);

        // Populate form
        categoryName.value = name;
        document.getElementById('categoryDescription').value = desc !== '-' ? desc : '';
        categoryStatus.checked = isActive;
        toggleText.textContent = isActive ? 'Active' : 'Inactive';

        // Scroll to form
        categoryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        categoryName.focus();

        // In production: fetch(`/api/categories/${categoryId}`)
    }

    let categoryToDelete = null;

    function handleDelete(e) {
        categoryToDelete = this.closest('tr');
        const categoryId = this.getAttribute('data-id');

        console.log('Delete category:', categoryId);

        // Show modal
        showModal();
    }

    // ============================================
    // Delete Confirmation Modal
    // ============================================

    const deleteModal = document.getElementById('deleteModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');

    function showModal() {
        deleteModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        deleteModal.classList.remove('show');
        document.body.style.overflow = '';
        categoryToDelete = null;
    }

    modalOverlay.addEventListener('click', hideModal);
    modalClose.addEventListener('click', hideModal);
    cancelDelete.addEventListener('click', hideModal);

    confirmDelete.addEventListener('click', function () {
        if (categoryToDelete) {
            const categoryId = categoryToDelete.querySelector('.btn-delete').getAttribute('data-id');

            console.log('Confirmed delete:', categoryId);

            // In production: fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })

            categoryToDelete.remove();
            hideModal();

            alert('Category deleted successfully!');
        }
    });

    // ============================================
    // Search Functionality
    // ============================================

    const searchCategory = document.getElementById('searchCategory');
    const tableBody = document.getElementById('categoriesTableBody');

    searchCategory.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = tableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const desc = row.querySelector('td:nth-child(3)').textContent.toLowerCase();

            if (name.includes(searchTerm) || desc.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // ============================================
    // Pagination
    // ============================================

    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');

    let currentPage = 1;
    const itemsPerPage = 10;

    function updatePagination() {
        const rows = Array.from(tableBody.querySelectorAll('tr')).filter(
            row => row.style.display !== 'none'
        );
        const totalPages = Math.ceil(rows.length / itemsPerPage);

        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages || 1;

        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage >= totalPages || totalPages === 0;

        // Show only current page items
        rows.forEach((row, index) => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            if (index >= startIndex && index < endIndex) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    prevPage.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
        }
    });

    nextPage.addEventListener('click', function () {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const totalPages = Math.ceil(rows.length / itemsPerPage);

        if (currentPage < totalPages) {
            currentPage++;
            updatePagination();
        }
    });

    // Initial pagination
    updatePagination();

    console.log('All features initialized successfully');
});
