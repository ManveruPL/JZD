import { describe, it, expect } from 'vitest';
import {
  normalizePolishText,
  levenshteinDistance,
  computeSimilarity,
  evaluateSubmittedAnswer
} from '../src/client/utils/textSimilarity.js';

describe('textSimilarity - Polish Quiz Answer Evaluation', () => {
  it('normalizes Polish diacritics and punctuation', () => {
    expect(normalizePolishText('Żółw błotny!')).toBe('zolw blotny');
    expect(normalizePolishText('  Mikołaj   Kopernik... ')).toBe('mikolaj kopernik');
    expect(normalizePolishText('Stanisław Lem (1921-2006)')).toBe('stanislaw lem 1921 2006');
  });

  it('calculates levenshtein distance correctly', () => {
    expect(levenshteinDistance('kot', 'kot')).toBe(0);
    expect(levenshteinDistance('kot', 'kod')).toBe(1);
    expect(levenshteinDistance('warszawa', 'krakow')).toBe(6);
  });

  it('computes similarity percentage correctly', () => {
    expect(computeSimilarity('Kopernik', 'kopernik')).toBe(1.0);
    expect(computeSimilarity('zolw', 'Żółw')).toBe(1.0);
    expect(computeSimilarity('Mikołaj Kopernik', 'Kopernik')).toBeGreaterThanOrEqual(0.85);
    expect(computeSimilarity('Zygmunt III Waza', 'Waza')).toBeGreaterThanOrEqual(0.85);
  });

  it('evaluates submitted answer against aliases', () => {
    const eval1 = evaluateSubmittedAnswer('Kopernik', 'Mikołaj Kopernik', ['Kopernik']);
    expect(eval1.confidence).toBe('EXACT');
    expect(eval1.isLikelyCorrect).toBe(true);

    const eval2 = evaluateSubmittedAnswer('konstytucja 3 maja', 'Konstytucja 3 Maja z 1791 roku', ['Konstytucja 3 maja']);
    expect(eval2.confidence).toBe('EXACT');
    expect(eval2.isLikelyCorrect).toBe(true);

    const eval3 = evaluateSubmittedAnswer('Warszawa', 'Kraków');
    expect(eval3.isLikelyCorrect).toBe(false);
    expect(eval3.confidence).toBe('LOW');
  });
});
