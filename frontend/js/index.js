import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
});

async function loadFeaturedProducts() {
    const marqueeRoot = document.getElementById('featuredMarqueeRoot');
    if (!marqueeRoot) return;
    
    // Show a quick loading state
    marqueeRoot.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            Loading featured jewelry...
        </div>
    `;

    try {
        // Fetch admin-selected featured products first.
        let { data: featuredData, error: featuredError } = await supabase
            .from('products')
            .select('id,name,price,image_url,category,stock_status,featured,created_at')
            .eq('featured', true)
            .order('created_at', { ascending: false })
            .limit(4);

        if (featuredError && String(featuredError.message || '').includes("Could not find the 'featured'")) {
            const fallbackFeaturedQuery = await supabase
                .from('products')
                .select('id,name,price,image_url,category,stock_status,created_at')
                .order('created_at', { ascending: false })
                .limit(4);
            featuredData = fallbackFeaturedQuery.data || [];
            featuredError = fallbackFeaturedQuery.error;
        }

        if (featuredError) throw featuredError;

        let productsToShow = featuredData || [];

        // Fill remaining slots if fewer than 4 featured products exist.
        if (productsToShow.length < 4) {
            const excludeIds = productsToShow.map((p) => p.id);
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('products')
                .select('id,name,price,image_url,category,stock_status,created_at')
                .not('id', 'in', `(${excludeIds.length ? excludeIds.join(',') : 0})`)
                .order('created_at', { ascending: false })
                .limit(4 - productsToShow.length);

            if (fallbackError) throw fallbackError;
            productsToShow = [...productsToShow, ...(fallbackData || [])];
        }

        if (productsToShow.length > 0) {
            const cards = productsToShow.map((product) => `
                <article class="featured-slide">
                    <a href="pages/collections.html" class="featured-slide-link" aria-label="View ${escapeHtml(product.name)} in collection">
                        <div class="product-card">
                            <div class="product-card-image" style="position: relative; padding-top: 100%; overflow: hidden;">
                                <img src="${product.image_url}" alt="${escapeHtml(product.name)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                            </div>
                            <div class="product-card-content">
                                <h3 class="product-card-title">${escapeHtml(product.name)}</h3>
                                <p class="product-card-price">BDT ${Number(product.price || 0).toLocaleString('en-BD')}</p>
                            </div>
                        </div>
                    </a>
                </article>
            `).join('');

            // Duplicate track content for seamless infinite loop.
            const duplicated = cards + cards;

            marqueeRoot.innerHTML = `
                <div class="featured-marquee">
                    <div class="featured-track">
                        ${duplicated}
                    </div>
                </div>
            `;
        } else {
            marqueeRoot.innerHTML = `<div style="text-align: center;">No featured jewelry available right now.</div>`;
        }
    } catch (e) {
        console.error('Error fetching featured products:', e);
        marqueeRoot.innerHTML = `<div style="text-align: center;">Could not load products. Please try again later.</div>`;
    }
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
