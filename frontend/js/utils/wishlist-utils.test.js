import { describe, expect, it } from 'vitest';
import { getWishlistCountLabel, getWishlistImageUrl, mapWishlistRowsToItems } from './wishlist-utils.js';

describe('mapWishlistRowsToItems', () => {
    it('maps Supabase wishlist join rows to UI items', () => {
        const rows = [
            {
                product_id: 11,
                products: {
                    id: 11,
                    name: 'Sapphire Ring',
                    price: 38000,
                    image_url: 'ring-11.jpg',
                    category: 'rings',
                    stock_status: 'in_stock'
                }
            }
        ];

        expect(mapWishlistRowsToItems(rows)).toEqual([
            {
                id: 11,
                name: 'Sapphire Ring',
                price: 38000,
                image_url: 'ring-11.jpg',
                category: 'rings',
                stock_status: 'in_stock'
            }
        ]);
    });

    it('filters invalid rows and applies defaults', () => {
        const rows = [
            { product_id: 1, products: null },
            {
                product_id: 12,
                products: {
                    id: 12,
                    name: 'Emerald Necklace',
                    price: 72000,
                    image_url: null,
                    category: null,
                    stock_status: null
                }
            }
        ];

        expect(mapWishlistRowsToItems(rows)).toEqual([
            {
                id: 12,
                name: 'Emerald Necklace',
                price: 72000,
                image_url: '',
                category: '',
                stock_status: 'in_stock'
            }
        ]);
    });
});

describe('getWishlistCountLabel', () => {
    it('returns friendly count labels', () => {
        expect(getWishlistCountLabel(0)).toBe('No items saved');
        expect(getWishlistCountLabel(1)).toBe('1 item saved');
        expect(getWishlistCountLabel(5)).toBe('5 items saved');
    });
});

describe('getWishlistImageUrl', () => {
    it('prefers image_url then image then placeholder', () => {
        expect(getWishlistImageUrl({ image_url: 'a.jpg', image: 'b.jpg' })).toBe('a.jpg');
        expect(getWishlistImageUrl({ image: 'b.jpg' })).toBe('b.jpg');
        expect(getWishlistImageUrl({})).toBe('https://placehold.co/400x300/f5f5f5/333333?text=Jewelry');
    });
});
