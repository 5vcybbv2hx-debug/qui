/**
 * Barcode/QR-Code Search Utility
 * Robust matching for scanned codes to articles
 */

export function findArticleByCode(code, articles) {
  if (!code || !articles) return null;

  const normalizedCode = code.trim().toLowerCase();

  // 1. Exact barcode match
  let match = articles.find(
    a => a.barcode && a.barcode.toLowerCase() === normalizedCode
  );
  if (match) return { article: match, matchType: 'barcode' };

  // 2. Exact QR code match
  match = articles.find(
    a => a.qr_code && a.qr_code.toLowerCase() === normalizedCode
  );
  if (match) return { article: match, matchType: 'qr_code' };

  // 3. Partial barcode match (suffix/EAN variations)
  match = articles.find(
    a => a.barcode && a.barcode.toLowerCase().includes(normalizedCode)
  );
  if (match) return { article: match, matchType: 'barcode_partial' };

  return null;
}

/**
 * Find multiple potential matches (for disambiguation UI)
 */
export function findArticlesByCodeFuzzy(code, articles) {
  if (!code || !articles) return [];

  const normalizedCode = code.trim().toLowerCase();
  const matches = [];

  // Exact matches first
  articles.forEach(a => {
    if (a.barcode && a.barcode.toLowerCase() === normalizedCode) {
      matches.push({ article: a, matchType: 'barcode_exact', score: 100 });
    }
  });
  if (matches.length > 0) return matches;

  articles.forEach(a => {
    if (a.qr_code && a.qr_code.toLowerCase() === normalizedCode) {
      matches.push({ article: a, matchType: 'qr_exact', score: 100 });
    }
  });
  if (matches.length > 0) return matches;

  // Fuzzy: partial matches + name
  articles.forEach(a => {
    let score = 0;

    if (a.barcode?.toLowerCase().includes(normalizedCode)) score = 80;
    if (a.name.toLowerCase().includes(normalizedCode)) score = Math.max(score, 60);

    if (score > 0) {
      matches.push({ article: a, matchType: 'fuzzy', score });
    }
  });

  return matches.sort((a, b) => b.score - a.score);
}