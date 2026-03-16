import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
});

function getResolvedImageUrl(rawImage) {
    const value = String(rawImage || '').trim();
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    const normalized = value.replace(/^\/+/, '');
    const pathCandidate = normalized.startsWith('products/') ? normalized : `products/${normalized}`;
    const { data } = supabase.storage.from('products').getPublicUrl(pathCandidate);
    return data?.publicUrl || '';
}

function normalizeProductCategory(rawCategory) {
    const category = String(rawCategory || '').toLowerCase().trim();

    if (category.includes('ring')) return 'rings';
    if (category.includes('necklace')) return 'necklaces';
    if (category.includes('bracelet')) return 'bracelets';
    if (category.includes('earring')) return 'earrings';
    if (category.includes('set')) return 'setitems';

    return category;
}

function getPriceRangeForCategory(product) {
    const category = normalizeProductCategory(product?.category);
    const productName = String(product?.name || '').toLowerCase();

    // Override only for jewellery sets that specifically mention ring/bracelet.
    if (category === 'setitems' && (productName.includes('ring') || productName.includes('bracelet'))) {
        return [300, 350];
    }

    if (category === 'rings') return [150, 220];
    if (category === 'necklaces') return [200, 280];
    if (category === 'bracelets') return [150, 220];
    if (category === 'earrings') return [150, 220];
    if (category === 'setitems') return [200, 500];

    return null;
}

function getFixedPriceOverride(product) {
    const name = String(product?.name || '').toLowerCase().trim();

    if (name === 'nechlace+earring+ring 1' || name === 'necklace+earring+ring 1') return 500;
    if (name === 'necklace+bracelet+ring') return 400;
    if (name === 'necklace+earring 1') return 420;
    if (name === 'necklace+earring+bracelet') return 450;

    return null;
}

function getDeterministicCategoryPrice(product) {
    const fixedPrice = getFixedPriceOverride(product);
    if (fixedPrice !== null) return fixedPrice;

    const range = getPriceRangeForCategory(product);
    if (!range) return Number(product?.price || 0);

    const [min, max] = range;
    const start = Math.ceil(min / 5) * 5;
    const end = Math.floor(max / 5) * 5;
    if (start > end) return Number(product?.price || 0);

    const steps = Math.floor((end - start) / 5) + 1;
    const seed = `${product?.id ?? ''}-${product?.name ?? ''}-${product?.category ?? ''}`;
    let hash = 0;

    for (let i = 0; i < seed.length; i += 1) {
        hash = ((hash * 31) + seed.charCodeAt(i)) | 0;
    }

    const stepIndex = Math.abs(hash) % steps;
    return start + (stepIndex * 5);
}

function applyCategoryPriceMapping(products) {
    return (products || []).map((product) => ({
        ...product,
        price: getDeterministicCategoryPrice(product)
    }));
}

function buildProductCollectionsLink(product) {
    const params = new URLSearchParams();
    if (product?.category) {
        params.set('category', String(product.category));
    }
    if (product?.name) {
        params.set('search', String(product.name));
    }
    const query = params.toString();
    return query ? `pages/collections.html?${query}` : 'pages/collections.html';
}

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

        productsToShow = applyCategoryPriceMapping(productsToShow);

        if (productsToShow.length > 0) {
            const cards = productsToShow.map((product) => {
                const imageUrl = getResolvedImageUrl(product.image_url);
                const productLink = buildProductCollectionsLink(product);
                const imageHtml = imageUrl
                    ? `<img src="${imageUrl}" alt="${escapeHtml(product.name)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" loading="lazy">`
                    : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f2f2f2;color:#777;font-size:0.85rem;">No image</div>`;

                return `
                <article class="featured-slide">
                    <a href="${productLink}" class="featured-slide-link" aria-label="View ${escapeHtml(product.name)} in collection">
                        <div class="product-card">
                            <div class="product-card-image" style="position: relative; padding-top: 100%; overflow: hidden;">
                                ${imageHtml}
                            </div>
                            <div class="product-card-content">
                                <h3 class="product-card-title">${escapeHtml(product.name)}</h3>
                                <p class="product-card-price">BDT ${Number(product.price || 0).toLocaleString('en-BD')} each</p>
                            </div>
                        </div>
                    </a>
                </article>
            `;
            }).join('');

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
