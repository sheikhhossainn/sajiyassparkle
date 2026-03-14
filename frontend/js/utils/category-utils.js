export function normalizeCategory(rawCategory) {
    const category = String(rawCategory || '').toLowerCase().trim();

    if (category.startsWith('setitems')) return 'setitems';
    if (category.startsWith('ring')) return 'rings';
    if (category.startsWith('earring')) return 'earrings';
    if (category.startsWith('bracelet')) return 'bracelets';
    if (category.startsWith('necklace')) return 'necklaces';

    return category;
}

export function categoryMatches(productCategory, selectedCategory) {
    const normalizedProduct = normalizeCategory(productCategory);
    const normalizedSelected = normalizeCategory(selectedCategory);

    if (normalizedSelected === 'all') return true;
    return normalizedProduct === normalizedSelected;
}

export function formatCategoryLabel(category) {
    const normalizedCategory = normalizeCategory(category);
    const categoryMap = {
        rings: 'Rings',
        necklaces: 'Necklaces',
        earrings: 'Earrings',
        bracelets: 'Bracelets',
        setitems: 'Jewelry Sets',
        bridal: 'Others'
    };

    return categoryMap[normalizedCategory] || category;
}
