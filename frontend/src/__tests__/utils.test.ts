import { describe, it, expect } from 'vitest';
import { formatDuration, formatDate, cn } from '../lib/utils';

describe('Utility functions', () => {
    describe('formatDuration', () => {
        it('formats seconds into MM:SS', () => {
            expect(formatDuration(0)).toBe('00:00');
            expect(formatDuration(61)).toBe('01:01');
            expect(formatDuration(3661)).toBe('61:01');
        });
    });

    describe('formatDate', () => {
        it('formats an ISO date string into a human-readable string', () => {
            const result = formatDate('2024-01-15');
            expect(result).toContain('2024');
            expect(result).toContain('15');
        });

        it('accepts custom format options', () => {
            const result = formatDate('2024-01-15', { month: 'short', year: 'numeric' });
            expect(result).toContain('2024');
        });
    });

    describe('cn', () => {
        it('merges class names correctly', () => {
            expect(cn('foo', 'bar')).toBe('foo bar');
        });

        it('deduplicates conflicting tailwind classes', () => {
            // tailwind-merge should resolve conflicting utility classes
            const result = cn('text-red-500', 'text-blue-500');
            expect(result).toBe('text-blue-500');
        });

        it('handles conditional classes', () => {
            const result = cn('base', false && 'hidden', 'shown');
            expect(result).toBe('base shown');
        });
    });
});
