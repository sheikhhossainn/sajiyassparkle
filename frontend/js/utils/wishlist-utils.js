export function mapWishlistRowsToItems(rows) {
    return (rows || [])
        .map(row => row?.products)
        .filter(Boolean)
        .map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url || '',
            category: product.category || '',
            stock_status: product.stock_status || 'in_stock'
        }));
}

export function getWishlistCountLabel(itemCount) {
    if (!itemCount) return 'No items saved';
    if (itemCount === 1) return '1 item saved';
    return `${itemCount} items saved`;
}

export function getWishlistImageUrl(item) {
    return item?.image_url || item?.image || 'https://placehold.co/400x300/f5f5f5/333333?text=Jewelry';
}
