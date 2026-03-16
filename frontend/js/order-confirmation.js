import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get order ID from URL
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');

    if (!orderId) {
        // If no ordered, gently redirect or show empty
        document.getElementById('order-id-display').textContent = 'Invalid Order';
        return;
    }

    // Format the order number to look professional (e.g. SJS-0042)
    const formattedId = isNaN(orderId) ? orderId.substring(0, 8).toUpperCase() : String(orderId).padStart(4, '0');
    document.getElementById('order-id-display').textContent = `#SJS-${formattedId}`;

    try {
        // 2. Fetch User & Order Info
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        // Fetch Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    quantity,
                    price_at_purchase,
                    products (
                        name,
                        image_url
                    )
                )
            `)
            .eq('id', orderId)
            .single();

        if (orderError) throw orderError;

        // 3. Update Delivery Address
        const deliveryAddressEl = document.getElementById('delivery-address');
        const userEmailInfo = user?.email ? `<p>${escapeHtml(user.email)}</p>` : '';
        const userFullName = user?.user_metadata?.full_name ? `<p>${escapeHtml(user.user_metadata.full_name)}</p>` : '';
        const rawAddress = order.shipping_address || order.delivery_address || order.address || 'Address not provided';
        
        let addressHtml = userFullName;
        rawAddress.split(',').forEach(part => {
            addressHtml += `<p>${escapeHtml(part.trim())}</p>`;
        });
        deliveryAddressEl.innerHTML = addressHtml;

        // 4. Update Payment Method
        const paymentMethodEl = document.getElementById('payment-method');
        let paymentText = 'Cash on Delivery';
        if (order.payment_method === 'bkash') paymentText = 'bKash';
        if (order.payment_method === 'nagad') paymentText = 'Nagad';
        
        let paymentSubText = '';
        if (order.transaction_id) {
            paymentSubText = `<p>TrxID: ${escapeHtml(order.transaction_id)}</p>`;
        }
        paymentMethodEl.innerHTML = `<p>${paymentText}</p>${paymentSubText}`;

        // 5. Update Contact Info
        const contactInfoEl = document.getElementById('contact-info');
        let contactHtml = userEmailInfo;
        if (order.sender_number) {
            contactHtml += `<p>${escapeHtml(order.sender_number)}</p>`;
        } else if (user?.user_metadata?.phone) {
             contactHtml += `<p>${escapeHtml(user.user_metadata.phone)}</p>`;
        }
        contactInfoEl.innerHTML = contactHtml || '<p>Not provided</p>';

        // 6. Update Estimated Delivery
        const deliveryDateEl = document.getElementById('delivery-date');
        const estDate = new Date(order.created_at);
        estDate.setDate(estDate.getDate() + 4); // roughly 3-5 days
        deliveryDateEl.textContent = estDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // 7. Update Order Summary
        const itemsContainer = document.getElementById('order-items-container');
        if (order.order_items && order.order_items.length > 0) {
            const itemsHtml = order.order_items.map(item => {
                const product = item.products;
                const price = item.price_at_purchase || 0;
                
                // Construct image URL (fall-back safely)
                let imageUrl = 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80';
                if (product?.image_url) {
                    if (product.image_url.startsWith('http')) {
                        imageUrl = product.image_url;
                    } else {
                        const bucket = product.image_url.includes('collections') ? 'collections' : 'products';
                        imageUrl = `https://rztfvxptzchzcrshcnhk.supabase.co/storage/v1/object/public/${bucket}/${product.image_url}`;
                    }
                }

                return `
                    <div class="order-item">
                        <div class="order-item-image">
                            <img src="${imageUrl}" alt="${escapeHtml(product?.name || 'Item')}">
                        </div>
                        <div class="order-item-details">
                            <h3 class="order-item-name">${escapeHtml(product?.name || 'Jewelry Piece')}</h3>
                            <p class="order-item-info">Quantity: ${item.quantity}</p>
                        </div>
                        <div class="order-item-price">৳${price.toLocaleString()}</div>
                    </div>
                `;
            }).join('');
            
            itemsContainer.innerHTML = itemsHtml;
        } else {
            itemsContainer.innerHTML = '<p>No items found.</p>';
        }

        // Calculate Totals (Assuming logic closely mirrors checkout.js)
        const subtotal = order.total_amount || 0;
        
        document.getElementById('order-subtotal').textContent = `৳${subtotal.toLocaleString()}`;
        document.getElementById('order-total').textContent = `৳${subtotal.toLocaleString()}`;

        // Fade in content
        const mainContent = document.getElementById('main-order-confirmation-content');
        if (mainContent) mainContent.style.opacity = '1';

    } catch (error) {
        console.error('Error fetching order details:', error);
        document.getElementById('order-items-container').innerHTML = '<p>Could not load order details.</p>';
        const mainContent = document.getElementById('main-order-confirmation-content');
        if (mainContent) mainContent.style.opacity = '1';
    }
});

// Utility for safe HTML escaping
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
