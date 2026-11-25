/**
 * Deterministic source relevance assessment.
 * Compares a submitted or discovered source against the target business identity,
 * location, and category so unrelated sources are flagged instead of polluting facts.
 */

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'our',
  'in', 'on', 'at', 'to', 'of', 'a', 'an', 'by', 'or', 'pvt', 'ltd',
  'inc', 'llc', 'co', 'company', 'services', 'service', 'official',
]);

const MAJOR_CITIES = [
  'mumbai', 'delhi', 'new delhi', 'bengaluru', 'bangalore', 'hyderabad',
  'chennai', 'kolkata', 'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow',
  'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna',
  'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad',
  'meerut', 'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad',
  'amritsar', 'allahabad', 'ranchi', 'howrah', 'coimbatore', 'jabalpur',
  'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota',
  'chandigarh', 'guwahati', 'solapur', 'hubli', 'mysore', 'tiruchirappalli',
  'london', 'new york', 'san francisco', 'los angeles', 'chicago', 'dubai',
  'singapore', 'toronto', 'sydney',
];

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function normalizePhrase(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Assess whether a source matches the target business.
 *
 * @param {object} params
 * @param {object} params.business - Business record ({ name, city, state, category })
 * @param {object} params.source - Source record ({ type, url, originalFileName, sourceMetadata })
 * @param {string} [params.extractedText] - Extracted text from PDF/image/web
 * @returns {{ relevance: 'relevant'|'needs_review'|'mismatched', reason: string }}
 */
export function assessSourceRelevance({ business = {}, source = {}, extractedText = '' }) {
  const businessName = business?.name || '';
  const businessCity = business?.city || '';
  const businessState = business?.state || '';
  const businessCategory = business?.category || '';

  const combinedRaw = [
    source?.url || '',
    source?.originalFileName || '',
    source?.sourceMetadata?.title || '',
    source?.sourceMetadata?.snippet || '',
    extractedText || '',
  ]
    .filter(Boolean)
    .join(' ');

  const combinedNorm = normalizePhrase(combinedRaw);
  const combinedTokens = new Set(tokenize(combinedRaw));

  if (!combinedNorm) {
    return {
      relevance: 'needs_review',
      reason: 'Source contained no readable text or metadata to verify relevance.',
    };
  }

  const nameNorm = normalizePhrase(businessName);
  const nameTokens = tokenize(businessName);
  const cityNorm = normalizePhrase(businessCity);
  const stateNorm = normalizePhrase(businessState);
  const categoryTokens = tokenize(businessCategory);

  const exactNameMatch = nameNorm.length >= 3 && combinedNorm.includes(nameNorm);
  const nameTokenHits = nameTokens.filter((t) => combinedTokens.has(t));
  const strongNameMatch =
    exactNameMatch ||
    (nameTokens.length > 0 && nameTokenHits.length === nameTokens.length);

  const cityMatch = cityNorm.length >= 3 && combinedNorm.includes(cityNorm);
  const stateMatch = stateNorm.length >= 3 && combinedNorm.includes(stateNorm);
  const categoryHits = categoryTokens.filter((t) => combinedTokens.has(t));
  const categoryMatch = categoryHits.length > 0;

  // Detect competing city mentioned in source when target city is different
  const conflictingCity = MAJOR_CITIES.find(
    (c) => c !== cityNorm && !cityNorm.includes(c) && combinedNorm.includes(c)
  );

  // Detect unrelated personal/medical/academic credential files when business name doesn't match
  const hasUnrelatedCredential =
    /\b(psyd|phd|md|mbbs|resume|curriculum vitae|cv)\b/i.test(combinedRaw) &&
    !(/\b(doctor|clinic|hospital|medical|dental|therapy|psycholog|health|dr)\b/i.test(
      `${businessName} ${businessCategory}`
    ));

  if (strongNameMatch && !conflictingCity) {
    return {
      relevance: 'relevant',
      reason: `Matches business name "${businessName}"${cityMatch ? ` and location "${businessCity}"` : ''}.`,
    };
  }

  if (strongNameMatch && conflictingCity && !cityMatch) {
    return {
      relevance: 'mismatched',
      reason: `Source references "${conflictingCity}" instead of "${businessCity || 'target location'}".`,
    };
  }

  if (hasUnrelatedCredential) {
    return {
      relevance: 'mismatched',
      reason: `Source appears to be an unrelated personal/medical document rather than "${businessName}" (${businessCategory || 'business'}).`,
    };
  }

  if (!strongNameMatch && conflictingCity && !cityMatch) {
    return {
      relevance: 'mismatched',
      reason: `Source does not mention "${businessName}" and references "${conflictingCity}" instead of "${businessCity || 'target location'}".`,
    };
  }

  if (!strongNameMatch && nameTokenHits.length === 0 && !cityMatch && !categoryMatch) {
    return {
      relevance: 'mismatched',
      reason: `Source content does not match business "${businessName}", category "${businessCategory}", or location "${businessCity}".`,
    };
  }

  if (!strongNameMatch && !cityMatch && (source?.url || source?.originalFileName)) {
    return {
      relevance: 'mismatched',
      reason: `Source could not be matched to "${businessName}" in "${businessCity || 'your location'}".`,
    };
  }

  return {
    relevance: 'needs_review',
    reason: `Partial match (${cityMatch ? 'location' : stateMatch ? 'state' : 'category'} matched), but business name "${businessName}" was not clearly confirmed.`,
  };
}
