import { supabase } from './supabase.js';

function getResolvedImageUrl(rawImage) {
    const value = String(rawImage || '').trim();
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    const normalized = value.replace(/^\/+/, '');
    const pathCandidate = normalized.startsWith('products/') ? normalized : `products/${normalized}`;
    const { data } = supabase.storage.from('products').getPublicUrl(pathCandidate);
    return data?.publicUrl || '';
}

function extractFirstResolvableImage(rows) {
    for (const row of rows || []) {
        const resolved = getResolvedImageUrl(row.image_url);
        if (resolved) return resolved;
    }
    return '';
}

async function loadQualityAssuranceFeaturedImage() {
    const imageEl = document.getElementById('quality-assurance-image');
    if (!imageEl) return;

    try {
        let imageUrl = '';

        // Priority 1: Featured collection product image.
        let { data: featuredData, error: featuredError } = await supabase
            .from('products')
            .select('image_url, featured, created_at')
            .eq('featured', true)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);

        if (featuredError && String(featuredError.message || '').includes("Could not find the 'featured'")) {
            const fallbackFeaturedQuery = await supabase
                .from('products')
                .select('image_url, created_at')
                .not('image_url', 'is', null)
                .order('created_at', { ascending: false })
                .limit(20);

            featuredData = fallbackFeaturedQuery.data || [];
            featuredError = fallbackFeaturedQuery.error;
        }

        if (!featuredError) {
            imageUrl = extractFirstResolvableImage(featuredData);
        }

        // Priority 2: Fallback to latest products if featured list is empty.
        if (!imageUrl) {
            const { data: latestData, error: latestError } = await supabase
                .from('products')
                .select('image_url, created_at')
                .not('image_url', 'is', null)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!latestError) {
                imageUrl = extractFirstResolvableImage(latestData);
            }
        }

        if (imageUrl) {
            imageEl.src = imageUrl;
            imageEl.alt = 'Featured collection jewelry';
        }
    } catch (error) {
        console.warn('Could not load featured image for About page:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadQualityAssuranceFeaturedImage();
});
