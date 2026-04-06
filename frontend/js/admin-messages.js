import { supabase } from './supabase.js';

const ADMIN_SESSION_KEY = '_admin_session';

function getAdminSession() {
    try {
        const cached = sessionStorage.getItem(ADMIN_SESSION_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        return null;
    }
}

function clearAdminSession() {
    try {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (error) {
        console.warn('Failed to clear admin session:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupSidebarToggle();
    setupLogout();

    const accessGranted = await ensureAdminAccess();
    if (!accessGranted) return;

    setupModalHandlers();
    await loadMessages();
});

const state = {
    messages: [],
    activeMessage: null
};

function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (!menuToggle || !sidebar) return;
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

function setupLogout() {
    const logoutLink = document.querySelector('.sidebar-logout');
    if (!logoutLink) return;

    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearAdminSession();
        sessionStorage.setItem('_supabase_force_signed_out', String(Date.now()));
        const sbKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (sbKey) localStorage.removeItem(sbKey);
        window.location.href = 'admin-login.html';
    });
}

async function ensureAdminAccess() {
    const adminSession = getAdminSession();
    const userId = adminSession?.user?.id;

    if (!userId) {
        clearAdminSession();
        window.location.href = 'admin-login.html';
        return false;
    }

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (error || !profile?.is_admin) {
            alert('Access denied. Admin account required.');
            clearAdminSession();
            window.location.href = 'admin-login.html';
            return false;
        }

        setInterval(() => {
            if (!getAdminSession()) {
                clearAdminSession();
                window.location.href = 'admin-login.html';
            }
        }, 30000);

        return true;
    } catch (err) {
        console.error('Error checking admin access:', err);
        return false;
    }
}

function setupModalHandlers() {
    const body = document.getElementById('messagesTableBody');
    const closeBtn = document.getElementById('closeModalBtn');
    const archiveBtn = document.getElementById('archiveMessageBtn');
    const backdrop = document.getElementById('messageModalBackdrop');
    const form = document.getElementById('messageActionForm');

    if (body) {
        body.addEventListener('click', async (event) => {
            const btn = event.target.closest('.btn-view-message');
            if (!btn) return;

            const messageId = Number(btn.dataset.messageId);
            await openMessageModal(messageId);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMessageModal);
    }

    if (backdrop) {
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) {
                closeMessageModal();
            }
        });
    }

    if (form) {
        form.addEventListener('submit', handleMessageSave);
    }

    if (archiveBtn) {
        archiveBtn.addEventListener('click', handleArchiveMessage);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMessageModal();
        }
    });
}

async function loadMessages() {
    
    const { data, error } = await supabase
        .from('messages')
        .select('id, customer_name, customer_email, message_type, message_body, status, admin_reply, replied_at, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch messages:', error.message);
        renderErrorState('Failed to load messages.');
        return;
    }

    state.messages = data || [];
    renderMessagesTable(state.messages);
    updateUnreadBadge(state.messages);
}

function renderMessagesTable(messages) {
    const tableBody = document.getElementById('messagesTableBody');
    if (!tableBody) return;

    if (messages.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">No messages yet.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = messages.map((message) => {
        const status = normalizeStatus(message.status);
        const rowClass = status === 'new' ? 'message-row-new' : '';

        return `
            <tr class="${rowClass}">
                <td>${formatDate(message.created_at)}</td>
                <td>${escapeHtml(message.customer_name)}</td>
                <td>${escapeHtml(message.customer_email)}</td>
                <td>${escapeHtml(message.message_type)}</td>
                <td><span class="status-chip status-${status}">${status}</span></td>
                <td>
                    <button class="btn-view-message" data-message-id="${message.id}" type="button">View / Reply</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateUnreadBadge(messages) {
    const badge = document.getElementById('messagesUnreadBadge');
    if (!badge) return;

    const unreadCount = messages.filter((message) => normalizeStatus(message.status) === 'new').length;

    if (unreadCount > 0) {
        badge.hidden = false;
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    } else {
        badge.hidden = true;
        badge.textContent = '0';
    }
}

async function openMessageModal(messageId) {
    const message = state.messages.find((item) => Number(item.id) === Number(messageId));
    if (!message) return;

    if (normalizeStatus(message.status) === 'new') {
        
        const { error } = await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('id', message.id);

        if (!error) {
            message.status = 'read';
            renderMessagesTable(state.messages);
            updateUnreadBadge(state.messages);
        }
    }

    state.activeMessage = message;

    setText('modalDate', formatDate(message.created_at));
    setText('modalCustomerName', message.customer_name || '-');
    setText('modalCustomerEmail', message.customer_email || '-');
    setText('modalMessageType', message.message_type || '-');
    setText('modalMessageBody', message.message_body || '-');

    const statusSelect = document.getElementById('modalStatus');
    const replyInput = document.getElementById('modalReply');

    if (statusSelect) {
        const normalized = normalizeStatus(message.status);
        statusSelect.value = normalized === 'new' ? 'read' : normalized;
    }

    if (replyInput) {
        replyInput.value = message.admin_reply || '';
    }

    const backdrop = document.getElementById('messageModalBackdrop');
    if (backdrop) backdrop.classList.add('open');
}

function closeMessageModal() {
    const backdrop = document.getElementById('messageModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
    state.activeMessage = null;
}

async function handleMessageSave(event) {
    event.preventDefault();

    if (!state.activeMessage) return;

    

    const saveButton = document.getElementById('saveMessageBtn');
    const statusSelect = document.getElementById('modalStatus');
    const replyInput = document.getElementById('modalReply');

    const selectedStatus = statusSelect?.value || 'read';
    const replyText = (replyInput?.value || '').trim();
    const shouldSendReply = replyText.length > 0;

    const updates = {
        status: selectedStatus
    };

    if (shouldSendReply) {
        updates.admin_reply = replyText;
        updates.status = 'replied';
        updates.replied_at = new Date().toISOString();
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Sending...';
    }

    const { error } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', state.activeMessage.id);

    if (error) {
        alert('Failed to save message changes. Please try again.');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Send Reply';
        }
        return;
    }

    if (shouldSendReply) {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('send-admin-reply', {
            body: { messageId: state.activeMessage.id }
        });

        if (functionError || functionData?.success === false) {
            const message = functionData?.error || functionError?.message || 'Reply saved, but the email could not be sent right now.';
            alert(`Reply saved, but email failed: ${message}`);
        } else {
            alert('Reply sent successfully.');
        }
    }

    closeMessageModal();
    await loadMessages();

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Send Reply';
    }
}

async function handleArchiveMessage() {
    if (!state.activeMessage) return;

    
    const archiveBtn = document.getElementById('archiveMessageBtn');

    if (archiveBtn) {
        archiveBtn.disabled = true;
        archiveBtn.textContent = 'Archiving...';
    }

    const { error } = await supabase
        .from('messages')
        .update({ status: 'archived' })
        .eq('id', state.activeMessage.id);

    if (archiveBtn) {
        archiveBtn.disabled = false;
        archiveBtn.textContent = 'Archive';
    }

    if (error) {
        alert('Failed to archive message. Please try again.');
        return;
    }

    alert('Message archived.');
    closeMessageModal();
    await loadMessages();
}

function normalizeStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'read' || value === 'replied' || value === 'archived') return value;
    return 'new';
}

function formatDate(value) {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderErrorState(message) {
    const tableBody = document.getElementById('messagesTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="table-empty">${escapeHtml(message)}</td>
        </tr>
    `;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
