import { describe, it, expect } from 'vitest';
import {
    getGeneratedPdf,
    setGeneratedPdf,
    getPdfStoreVersion,
    bumpPdfStoreVersion,
} from '../stores/pdf.store';

describe('PDF Store', () => {
    it('returns null for an unknown appointment', () => {
        expect(getGeneratedPdf('UNKNOWN')).toBeNull();
    });

    it('stores and retrieves a PDF blob URL by appointment ID', () => {
        const mockUrl = 'blob:http://localhost:5173/pdf-test-uuid';
        setGeneratedPdf('APP-TEST-1', mockUrl);
        expect(getGeneratedPdf('APP-TEST-1')).toBe(mockUrl);
    });

    it('overwrites the old URL when a new one is set for the same appointment', () => {
        const firstUrl = 'blob:http://localhost:5173/first';
        const secondUrl = 'blob:http://localhost:5173/second';
        setGeneratedPdf('APP-TEST-2', firstUrl);
        setGeneratedPdf('APP-TEST-2', secondUrl);
        expect(getGeneratedPdf('APP-TEST-2')).toBe(secondUrl);
    });

    it('increments version on bump', () => {
        const before = getPdfStoreVersion();
        bumpPdfStoreVersion();
        expect(getPdfStoreVersion()).toBe(before + 1);
    });
});
