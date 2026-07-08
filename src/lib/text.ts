const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "for",
  "to",
  "will",
  "by",
  "is",
  "are",
  "be",
  "this",
  "that",
  "and",
  "or",
  "at",
  "as",
  "with",
  "from",
  "into",
  "over",
  "under",
  "than",
  "then",
  "before",
  "after",
  "market",
  "markets",
  "resolve",
  "resolves",
  "resolved",
  "question",
  "event",
  "yes",
  "no",
  "does",
  "do",
  "who",
  "what",
  "which",
  "win",
  "wins",
  "out",
  "off",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Below this Jaccard score, a cross-platform title match is treated as noise rather
 * than a real candidate — e.g. two titles that only share one generic word. Calibrated
 * against real examples: a genuine Fed-rate-decision match across platforms scores
 * ~0.2, while an unrelated pair that happens to share a single word scores ~0.09.
 */
export const MIN_MATCH_SIMILARITY = 0.15;

/** Jaccard similarity between the token sets of two strings, in [0, 1]. */
export function titleSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function extractKeywords(text: string, max = 6): string[] {
  return tokenize(text).slice(0, max);
}
