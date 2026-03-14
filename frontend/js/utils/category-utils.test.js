import { describe, expect, it } from 'vitest';
import { categoryMatches, formatCategoryLabel, normalizeCategory } from './category-utils.js';

describe('normalizeCategory', () => {
    it('normalizes singular and prefixed category variants', () => {
        expect(normalizeCategory('ring')).toBe('rings');
        expect(normalizeCategory('Earring')).toBe('earrings');
        expect(normalizeCategory('bracelets')).toBe('bracelets');
        expect(normalizeCategory('setitems necklace')).toBe('setitems');
    });

    it('returns trimmed unknown values as-is', () => {
        expect(normalizeCategory('  bridal  ')).toBe('bridal');
        expect(normalizeCategory('custom')).toBe('custom');
    });
});

describe('categoryMatches', () => {
    it('matches all categories when selected category is all', () => {
        expect(categoryMatches('rings', 'all')).toBe(true);
        expect(categoryMatches('setitems necklace', 'all')).toBe(true);
    });

    it('matches normalized categories exactly', () => {
        expect(categoryMatches('ring', 'rings')).toBe(true);
        expect(categoryMatches('earrings', 'rings')).toBe(false);
        expect(categoryMatches('setitems necklace', 'setitems')).toBe(true);
    });
});

describe('formatCategoryLabel', () => {
    it('returns readable labels for known categories', () => {
        expect(formatCategoryLabel('rings')).toBe('Rings');
        expect(formatCategoryLabel('setitems necklace')).toBe('Jewelry Sets');
    });

    it('returns original category for unknown labels', () => {
        expect(formatCategoryLabel('custom')).toBe('custom');
    });
});
