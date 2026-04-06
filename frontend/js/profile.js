import { supabase } from './supabase.js';

let currentProfileData = {};
const PROFILE_AVATAR_SIZE = 320;

function clearAuthSessionCache() {
    try {
        sessionStorage.removeItem('_supabase_session_cache');
        sessionStorage.setItem('_supabase_force_signed_out', String(Date.now()));
    } catch (error) {
        console.warn('Failed to clear auth cache:', error);
    }
}


// Initialize profile page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Profile page loaded');
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // Redirect to login if not authenticated (unless already there)
        window.location.href = '../pages/user-login.html';
        return;
    }

    const mainContent = document.getElementById('main-profile-content');
    if (mainContent) mainContent.style.opacity = '1';

    const user = session.user;
    console.log('Current User:', user);

    // Load Data Concurrently but let profile do optimistic render instantly
    loadUserProfile(user);
    loadUserOrders(user.id);

    // Handle editing profile
    const editProfileBtn = document.querySelector('.profile-edit-btn');
    const modal = document.getElementById('edit-profile-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const editForm = document.getElementById('edit-profile-form');

    if (editProfileBtn && modal) {
        editProfileBtn.addEventListener('click', function() {
            // Populate form
            const fullName = currentProfileData.username || user.user_metadata?.full_name || user.email.split('@')[0];
            document.getElementById('edit-full-name').value = fullName;
            
            // Get raw values
            const phone = currentProfileData.phone || user.user_metadata?.phone || '';
            const address = currentProfileData.address || user.user_metadata?.address || '';
            
            document.getElementById('edit-phone').value = phone;
            document.getElementById('edit-address').value = address;
            
            modal.style.display = 'flex';
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
             modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (modal && event.target === modal) {
            modal.style.display = 'none';
        }
    });

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = editForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;

            const updates = {
                username: document.getElementById('edit-full-name').value,
                phone: document.getElementById('edit-phone').value,
                address: document.getElementById('edit-address').value
            };

            try {
                const { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id);

                if (error) throw error;

                // Reload profile to update UI
                await loadUserProfile(user);
                modal.style.display = 'none';
                
                // Optional: Show a nicer toast instead of alert
                alert('Profile updated successfully!');
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile: ' + error.message);
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Handle Logout
    const logoutBtn = document.querySelector('.profile-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                clearAuthSessionCache();
                // Redirect to home page
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Error logging out:', error);
                alert('Failed to log out. Please try again.');
            }
        });
    }

    // Handle Delete Account
    const deleteBtn = document.querySelector('.profile-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently remove your profile and order history.')) {
                try {
                    // We need a specific RPC function to delete the user from auth.users
                    // If that function doesn't exist, we can only delete the profile data (soft delete)
                    
                    // Attempt to call the SQL function we will create
                    const { error } = await supabase.rpc('delete_user_account');
                    
                    if (error) {
                        console.error('Error deleting account:', error);
                        // Fallback: If RPC fails (e.g. not created yet), just sign out and show message
                        // ideally we would delete from 'profiles' table manually if RPC fails, 
                        // but RLS might block it or cascade might fail if not set up.
                        alert('Could not delete account details. Please contact support.');
                    } else {
                        await supabase.auth.signOut();
                        alert('Your account has been successfully deleted.');
                        window.location.href = '../index.html';
                    }
                } catch (err) {
                    console.error('Unexpected error:', err);
                    alert('An unexpected error occurred.');
                }
            }
        });
    }
});

async function loadUserProfile(user) {
    // 1. Optimistic Render (Fast)
    const initialName = user.user_metadata?.full_name || user.email.split('@')[0];
    const emailElement = document.querySelector('.profile-email');
    const nameElement = document.querySelector('.profile-name');
    const avatarContainer = document.querySelector('.profile-avatar');

    if (nameElement) nameElement.textContent = initialName;
    if (emailElement) emailElement.textContent = user.email;

    const initialAvatarUrl = resolveGoogleAvatarUrl(user) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(initialName)}&background=d4af37&color=fff&size=${PROFILE_AVATAR_SIZE}`;
    if (avatarContainer) {
        renderAvatarWithFallback(avatarContainer, initialAvatarUrl, initialName);
    }

    const memberSinceDate = new Date(user.created_at);
    const memberSince = memberSinceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    updateInfoItem('Member Since', memberSince);
    
    // Set fallback initial states 
    updateInfoItem('Address', user.user_metadata?.address || 'Address not added');
    updateInfoItem('Phone', user.user_metadata?.phone || 'Phone not added');

    // 2. Fetch from database (Async)
    let profileData = {};
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (data) {
            profileData = data;
        } else if (error && error.code !== 'PGRST116') { // Ignore "Not Found" error
           console.warn('Profile fetch warning:', error);
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
    
    currentProfileData = profileData;

    // 3. Update DOM with database data if different
    if (profileData.username) {
        if (nameElement) nameElement.textContent = profileData.username;
        if (avatarContainer && !resolveGoogleAvatarUrl(user)) {
             // Only update avatar if not using a Google provided one
               const updatedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.username)}&background=d4af37&color=fff&size=${PROFILE_AVATAR_SIZE}`;
             renderAvatarWithFallback(avatarContainer, updatedAvatar, profileData.username);
        }
    }

    if (profileData.address || user.user_metadata?.address) {
         updateInfoItem('Address', profileData.address || user.user_metadata?.address || 'Address not added');
    }
    
    if (profileData.phone || user.user_metadata?.phone) {
         updateInfoItem('Phone', profileData.phone || user.user_metadata?.phone || 'Phone not added');
    }
}

function updateInfoItem(label, text) {
    const infoItems = document.querySelectorAll('.profile-info-item');
    infoItems.forEach(item => {
        const labelEl = item.querySelector('.profile-info-label');
        if (labelEl && labelEl.textContent.trim() === label) {
            const textEl = item.querySelector('.profile-info-text');
            if (textEl) textEl.textContent = text;
        }
    });
}

function renderAvatarWithFallback(container, avatarUrl, fullName) {
    container.innerHTML = '';

    const image = document.createElement('img');
    image.src = avatarUrl;
    image.alt = 'Profile';
    image.setAttribute('referrerpolicy', 'no-referrer');
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.borderRadius = '50%';
    image.style.objectFit = 'cover';

    image.addEventListener('error', () => {
        const initials = getInitials(fullName);
        container.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;background:#f5f5f5;border:1px solid #d4af37;color:#1a1a1a;font-weight:700;font-size:1.25rem;">${initials}</span>`;
    });

    container.appendChild(image);
}

function getInitials(name) {
    return String(name || 'U')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || 'U';
}

function resolveGoogleAvatarUrl(user) {
    const identityData = Array.isArray(user?.identities)
        ? user.identities.map(identity => identity?.identity_data || {})
        : [];

    const candidates = [
        ...identityData.map(data => data.avatar_url),
        ...identityData.map(data => data.picture),
        user?.user_metadata?.avatar_url,
        user?.user_metadata?.picture
    ];

    const firstValid = candidates.find(url => typeof url === 'string' && url.trim().length > 0);
    if (!firstValid) return '';

    return toHighResAvatarUrl(String(firstValid).trim(), PROFILE_AVATAR_SIZE);
}

function toHighResAvatarUrl(url, size) {
    const cleanUrl = String(url || '').trim();
    if (!cleanUrl) return '';

    try {
        const parsed = new URL(cleanUrl);
        const host = parsed.hostname.toLowerCase();
        const isGoogleAvatar = host.includes('googleusercontent.com') || host.includes('ggpht.com');

        if (isGoogleAvatar) {
            const highResPath = parsed.pathname.replace(/=s\d+(-c)?$/, `=s${size}-c`);
            parsed.pathname = highResPath;
            parsed.searchParams.set('sz', String(size));
            return parsed.toString();
        }

        return cleanUrl;
    } catch (error) {
        return cleanUrl.replace(/=s\d+(-c)?$/, `=s${size}-c`);
    }
}

async function loadUserOrders(userId) {
    const orderHistoryCard = document.querySelector('.order-history-card');
    if (!orderHistoryCard) return;

    // Keep the title, remove the rest (static items)
    const title = orderHistoryCard.querySelector('.order-history-title');
    orderHistoryCard.innerHTML = ''; 
    if (title) orderHistoryCard.appendChild(title);

    try {
        // Fetch orders and their items + products
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    quantity,
                    products (
                        name,
                        price,
                        image_url
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!orders || orders.length === 0) {
            renderEmptyOrdersState(orderHistoryCard);
        } else {
            orders.forEach(order => {
                const orderElement = createOrderElement(order);
                orderHistoryCard.appendChild(orderElement);
            });
            attachOrderListeners();
        }

    } catch (err) {
        console.error('Error fetching orders:', err);
        orderHistoryCard.innerHTML += `<p style="padding: 1rem; color: red;">Failed to load order history.</p>`;
    }
}

function renderEmptyOrdersState(container) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.style.textAlign = 'center';
    emptyState.style.padding = '3rem 1rem';
    
    emptyState.innerHTML = `
        <div style="margin-bottom: 1.5rem; color: var(--color-neutral-medium);">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h3 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--color-primary);">No Orders Yet</h3>
        <p style="color: var(--color-neutral-medium); margin-bottom: 2rem;">You haven't placed any orders yet. Discover our exquisite collection today.</p>
        <a href="collections.html" class="btn btn-primary">Start Shopping</a>
    `;
    container.appendChild(emptyState);
}

function createOrderElement(order) {
    const date = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const status = order.status || 'pending';
    const statusLabel = status.replace(/_/g, ' ').toUpperCase();
    const total = parseFloat(order.total_amount || 0).toLocaleString();

    const formattedId = isNaN(order.id) ? order.id.substring(0, 8).toUpperCase() : String(order.id).padStart(4, '0');

    // Build products list HTML
    let productsHtml = '';
    if (order.order_items && order.order_items.length > 0) {
        productsHtml = order.order_items.map(item => {
            const product = item.products;
            const name = product ? product.name : 'Product Unavailable';
            const price = product ? parseFloat(product.price).toLocaleString() : '0';
            const img = product ? product.image_url : 'https://placehold.co/100x100?text=No+Image';
            
            return `
                <div class="order-product">
                    <div class="order-product-image">
                        <img src="${img}" alt="${name}">
                    </div>
                    <div class="order-product-info">
                        <h4 class="order-product-name">${name}</h4>
                        <p class="order-product-details">Quantity: ${item.quantity || 1}</p>
                    </div>
                    <div class="order-product-price">BDT ${price}</div>
                </div>
            `;
        }).join('');
    } else {
        productsHtml = '<p style="padding:1rem; font-style:italic;">No items details available.</p>';
    }

    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
        <div class="order-header">
            <div class="order-header-left">
                  <h3 class="order-number">Order #SJS-${formattedId}</h3>
                <span class="order-date">
                    <svg class="order-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    ${date}
                </span>
            </div>
            <span class="order-status order-status-${status.toLowerCase()}">${statusLabel}</span>
        </div>
        
<div class="order-products" id="order-products-${order.id}" style="display: none; border-top: 1px solid #eaeaea; padding-top: 1rem; margin-top: 1rem;">
            ${productsHtml}
        </div>

        <div class="order-footer">
            <div class="order-total">
                <span class="order-total-label">Total Amount:</span>
                <span class="order-total-price">৳${total}</span>
            </div>
            <div class="order-actions">
               <button class="btn btn-secondary order-details-btn toggle-details-btn" data-order-id="${order.id}">Toggle Details</button>
               <a href="order-confirmation.html?order_id=${order.id}" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem; text-align: center;">View Receipt</a>
            </div>
        </div>
    `;

    // Add hover effect via JS since we're creating dynamically (or CSS handles it)
    div.addEventListener('mouseenter', () => div.style.borderColor = 'var(--color-accent-gold)');
    div.addEventListener('mouseleave', () => div.style.borderColor = ''); // Reset to CSS default

    return div;
}

function attachOrderListeners() {
    // Toggle Products List
    const btns = document.querySelectorAll('.toggle-details-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
             const orderId = btn.dataset.orderId;
             const productsDiv = document.getElementById(`order-products-${orderId}`);
             if (productsDiv.style.display === 'none') {
                 productsDiv.style.display = 'block';
                 btn.textContent = 'Hide Details';
             } else {
                 productsDiv.style.display = 'none';
                 btn.textContent = 'Toggle Details';
             }
        });
    });
}

