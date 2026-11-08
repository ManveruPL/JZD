/**
 * Utility functions for analyzing contestant text answers against expected answers.
 * Provides Polish diacritics stripping, punctuation normalization, Levenshtein distance,
 * and high-confidence suggestions for the Game Master.
 */

export function normalizePolishText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritics
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    new Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function computeSimilarity(a: string, b: string): number {
  const normA = normalizePolishText(a);
  const normB = normalizePolishText(b);

  if (!normA.length || !normB.length) return 0;
  if (normA === normB) return 1.0;

  // Substring check: if one is completely inside the other and is significant (>= 4 chars)
  if (
    (normA.length >= 4 && normB.includes(normA)) ||
    (normB.length >= 4 && normA.includes(normB))
  ) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    return Math.max(0.85, minLen / maxLen);
  }

  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

export interface AnswerEvaluation {
  similarityPercent: number;
  confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW';
  matchedWith: string;
  label: string;
  isLikelyCorrect: boolean;
}

export function evaluateSubmittedAnswer(
  userAnswer: string,
  expectedAnswer: string,
  aliases: string[] = []
): AnswerEvaluation {
  const candidates = [expectedAnswer, ...(aliases || [])].filter(Boolean);

  let bestSim = 0;
  let bestCandidate = expectedAnswer;

  for (const cand of candidates) {
    const sim = computeSimilarity(userAnswer, cand);
    if (sim > bestSim) {
      bestSim = sim;
      bestCandidate = cand;
    }
  }

  const similarityPercent = Math.round(bestSim * 100);

  if (bestSim >= 0.98) {
    return {
      similarityPercent,
      confidence: 'EXACT',
      matchedWith: bestCandidate,
      label: 'Pełna zgodność (100%)',
      isLikelyCorrect: true
    };
  }

  if (bestSim >= 0.8) {
    return {
      similarityPercent,
      confidence: 'HIGH',
      matchedWith: bestCandidate,
      label: `Wysokie dopasowanie (${similarityPercent}%)`,
      isLikelyCorrect: true
    };
  }

  if (bestSim >= 0.55) {
    return {
      similarityPercent,
      confidence: 'MEDIUM',
      matchedWith: bestCandidate,
      label: `Częściowe podobieństwo (${similarityPercent}%)`,
      isLikelyCorrect: false
    };
  }

  return {
    similarityPercent,
    confidence: 'LOW',
    matchedWith: bestCandidate,
    label: `Niskie podobieństwo (${similarityPercent}%)`,
    isLikelyCorrect: false
  };
}
