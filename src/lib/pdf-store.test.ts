import { describe, it, expect, beforeEach } from 'vitest';
import { getGeneratedPdf, setGeneratedPdf } from './pdf-store';

describe('PDF Store', () => {
  beforeEach(() => {
    // Reset or mock environment here if needed
  });

  it('should store and retrieve a PDF URL by appointment ID', () => {
    const mockId = 'APP-TEST-1';
    const mockUrl = 'blob:http://localhost:3000/mock-uuid';
    
    expect(getGeneratedPdf(mockId)).toBeUndefined();
    
    setGeneratedPdf(mockId, mockUrl);
    
    expect(getGeneratedPdf(mockId)).toBe(mockUrl);
  });
});
