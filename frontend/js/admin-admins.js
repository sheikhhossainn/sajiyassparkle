import { supabase } from './supabase.js';

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'admin-login.html';
        return;
    }
    currentUser = session.user;

    // 2. Load Current Profile (to check Super Admin status)
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error || !data.is_admin) {
            window.location.href = '../index.html'; // Not an admin at all
            return;
        }

        currentProfile = data;
        
        // Show/Hide Controls based on Super Admin status
        if (currentProfile.is_super_admin) {
            document.getElementById('superAdminControls').style.display = 'block';
        }

        // 3. Load Admins List
        loadAdmins();

    } catch (err) {
        console.error('Error loading profile:', err);
    }

    // 4. Handle Add Admin
    const addForm = document.getElementById('addAdminForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('newAdminEmail');
            const messageDiv = document.getElementById('addAdminMessage');
            const email = emailInput.value.trim();
            
            messageDiv.textContent = 'Processing...';
            messageDiv.style.color = '#666';

            try {
                const { data, error } = await supabase.rpc('add_admin', { target_email: email });
                
                if (error) throw error;
                
                if (data.success) {
                    messageDiv.textContent = data.message;
                    messageDiv.style.color = 'green';
                    emailInput.value = '';
                    loadAdmins(); // Refresh list
                } else {
                    messageDiv.textContent = data.message;
                    messageDiv.style.color = 'red';
                }
            } catch (err) {
                console.error('Error adding admin:', err);
                messageDiv.textContent = 'Error: ' + err.message;
                messageDiv.style.color = 'red';
            }
        });
    }

    // Toggle Mobile Sidebar
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});

async function loadAdmins() {
    const listContainer = document.getElementById('adminsList');
    listContainer.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading admins...</div>';

    try {
        // Fetch all admins
        const { data: admins, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_admin', true)
            .order('created_at', { ascending: true });

        if (error) throw error;

        listContainer.innerHTML = '';
        
        if (admins.length === 0) {
            listContainer.innerHTML = '<p>No admins found.</p>';
            return;
        }

        admins.forEach(admin => {
            const el = createAdminElement(admin);
            listContainer.appendChild(el);
        });

    } catch (err) {
        console.error('Error loading admins:', err);
        listContainer.innerHTML = '<p style="color:red">Failed to load admins list.</p>';
    }
}

function createAdminElement(admin) {
    const div = document.createElement('div');
    div.className = 'admin-card';

    const initials = (admin.username || admin.email).substring(0, 2).toUpperCase();
    const isSuper = admin.is_super_admin;
    const isSelf = admin.id === currentUser.id;
    
    // Determine badge
    let badge = '';
    if (isSuper) {
        badge = `<span class="admin-badge badge-super">Super Admin</span>`;
    } else {
        badge = `<span class="admin-badge badge-regular">Admin</span>`;
    }

    // Determine actions
    let actionBtn = '';
    // Only show remove button if:
    // 1. Current user is Super Admin
    // 2. Target is NOT Super Admin
    // 3. Target is NOT self (implicit in #2 usually, but handled here)
    if (currentProfile.is_super_admin && !isSuper && !isSelf) {
        actionBtn = `
            <button class="btn" style="background:none; color:#dc2626; border:1px solid #fee2e2; padding: 0.5rem 1rem;" onclick="removeAdmin('${admin.id}')">
                Remove Access
            </button>
        `;
    }

    div.innerHTML = `
        <div class="admin-info">
            <div class="admin-avatar">${initials}</div>
            <div class="admin-details">
                <h4>${admin.username || 'Unknown Name'} ${badge}</h4>
                <p>${admin.email}</p>
                <p style="font-size: 0.75rem; color: #999;">Joined: ${new Date(admin.created_at).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="admin-actions">
            ${actionBtn}
        </div>
    `;

    return div;
}

// Make removeAdmin globally available for the onclick handler
window.removeAdmin = async function(id) {
    if (!confirm('Are you sure you want to remove admin privileges from this user?')) return;

    try {
        const { data, error } = await supabase.rpc('remove_admin', { target_id: id });
        
        if (error) throw error;
        
        if (data.success) {
            alert(data.message);
            loadAdmins();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Error removing admin:', err);
        alert('Failed to remove admin.');
    }
};
