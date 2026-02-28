import { describe, it, expect } from 'vitest';
import {
    getGeneratedMd,
    setGeneratedMd,
    getMdStoreVersion,
    bumpMdStoreVersion,
} from '../stores/md.store';

describe('Markdown Store', () => {
    it('returns null for an unknown appointment', () => {
        expect(getGeneratedMd('UNKNOWN-MD')).toBeNull();
    });

    it('stores and retrieves markdown content', () => {
        const content = '# Test Report\n\nSome clinical notes.';
        setGeneratedMd('APP-MD-1', content);
        expect(getGeneratedMd('APP-MD-1')).toBe(content);
    });

    it('overwrites existing markdown for the same appointment', () => {
        setGeneratedMd('APP-MD-2', 'old content');
        setGeneratedMd('APP-MD-2', 'new content');
        expect(getGeneratedMd('APP-MD-2')).toBe('new content');
    });

    it('increments version counter on bump', () => {
        const before = getMdStoreVersion();
        bumpMdStoreVersion();
        expect(getMdStoreVersion()).toBe(before + 1);
    });
});
