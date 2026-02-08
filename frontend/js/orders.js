// Sample orders data
const ordersData = [
    {
        orderNumber: "ORD-2026-001",
        date: "February 5, 2026",
        status: "delivered",
        items: [
            {
                name: "Gold Necklace",
                quantity: 1,
                price: 12500,
                image: "https://placehold.co/400x300/f5f5f5/d4af37?text=Gold+Necklace"
            }
        ],
        total: 12500
    },
    {
        orderNumber: "ORD-2026-002",
        date: "February 4, 2026",
        status: "shipped",
        items: [
            {
                name: "Diamond Ring",
                quantity: 1,
                price: 25000,
                image: "https://placehold.co/400x300/f5f5f5/c0c0c0?text=Diamond+Ring"
            },
            {
                name: "Emerald Earrings",
                quantity: 1,
                price: 18000,
                image: "https://placehold.co/400x300/f5f5f5/50c878?text=Emerald+Earrings"
            }
        ],
        total: 43000
    },
    {
        orderNumber: "ORD-2026-003",
        date: "February 2, 2026",
        status: "processing",
        items: [
            {
                name: "Pearl Bracelet",
                quantity: 2,
                price: 8500,
                image: "https://placehold.co/400x300/f5f5f5/f0f0f0?text=Pearl+Bracelet"
            }
        ],
        total: 17000
    },
    {
        orderNumber: "ORD-2026-004",
        date: "January 30, 2026",
        status: "pending",
        items: [
            {
                name: "Ruby Pendant",
                quantity: 1,
                price: 22000,
                image: "https://placehold.co/400x300/f5f5f5/e0115f?text=Ruby+Pendant"
            }
        ],
        total: 22000
    }
];

// Function to format price
function formatPrice(price) {
    return `₹${price.toLocaleString('en-IN')}`;
}

// Function to get status display text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'processing': 'Processing',
        'shipped': 'Shipped',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

// Function to create an order card
function createOrderCard(order) {
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';

    // Order items HTML
    const itemsHTML = order.items.map(item => `
        <div class="order-item">
            <div class="order-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-quantity">Quantity: ${item.quantity}</div>
            </div>
            <div class="order-item-price">${formatPrice(item.price)}</div>
        </div>
    `).join('');

    orderCard.innerHTML = `
        <div class="order-card-header">
            <div class="order-card-info">
                <div class="order-number">${order.orderNumber}</div>
                <div class="order-date">Placed on ${order.date}</div>
            </div>
            <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
        </div>

        <div class="order-items">
            ${itemsHTML}
        </div>

        <div class="order-card-footer">
            <div class="order-total">
                <span class="order-total-label">Total:</span>
                ${formatPrice(order.total)}
            </div>
            <div class="order-actions">
                <button class="btn btn-secondary btn-small">View Details</button>
                ${order.status === 'delivered' ? '<button class="btn btn-primary btn-small">Reorder</button>' : ''}
                ${order.status === 'pending' ? '<button class="btn btn-secondary btn-small">Cancel Order</button>' : ''}
            </div>
        </div>
    `;

    return orderCard;
}

// Function to render orders
function renderOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    const emptyState = document.getElementById('emptyState');

    if (ordersData.length === 0) {
        // Show empty state
        ordersContainer.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        // Show orders
        ordersContainer.style.display = 'block';
        emptyState.style.display = 'none';

        // Clear container
        ordersContainer.innerHTML = '';

        // Add order cards
        ordersData.forEach(order => {
            const orderCard = createOrderCard(order);
            ordersContainer.appendChild(orderCard);
        });
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    renderOrders();
});

// To test empty state, uncomment the following line:
// ordersData.length = 0;
