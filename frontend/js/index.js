import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
});

async function loadFeaturedProducts() {
    const featuredGrid = document.querySelector('.grid.grid-3');
    if (!featuredGrid) return;
    
    // Show a quick loading state
    featuredGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
            Loading featured jewelry...
        </div>
    `;

    try {
        // Fetch 3 random or newest products to feature on the homepage
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .limit(3);

        if (error) throw error;

        if (data && data.length > 0) {
            featuredGrid.innerHTML = data.map(product => `
                <div class="product-card">
                    <div class="product-card-image" style="position: relative; padding-top: 100%; overflow: hidden;">
                        <img src="${product.image_url}" alt="${product.name}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                    </div>
                    <div class="product-card-content">
                        <h3 class="product-card-title">${product.name}</h3>
                        <p class="product-card-price">BDT ${product.price.toLocaleString('en-BD')}</p>
                        <button class="btn btn-primary product-card-button" onclick="window.location.href='pages/collections.html'">View Collection</button>
                    </div>
                </div>
            `).join('');
        } else {
            featuredGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center;">No featured jewelry available right now.</div>`;
        }
    } catch (e) {
        console.error('Error fetching featured products:', e);
        featuredGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center;">Could not load products. Please try again later.</div>`;
    }
}
