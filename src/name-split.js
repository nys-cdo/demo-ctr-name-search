// How the Renew Your License portal reads the "Your full name" box.
//
// splitFullName and otherDivisions copy the portal's own rules line for line, so
// this page shows what the portal sends. matchKind names the rule the search
// applies to each part. Keep all three in step with the portal and API code; the
// tests in test/name-split.test.js hold the portal's answers.

const SUFFIXES = { jr: 'Jr.', sr: 'Sr.', ii: 'II', iii: 'III', iv: 'IV' };

/** The search tries other divisions only for names of six words or fewer. */
const MAX_DIVISION_WORDS = 6;

function suffixFor(word) {
  return SUFFIXES[String(word).toLowerCase().replace(/\.+$/u, '')];
}

/** A word made only of punctuation names nothing, so the split drops it. */
function namesSomething(word) {
  return /[\p{L}\p{N}]/u.test(word);
}

/**
 * Splits one typed name into the parts a license record keeps.
 * Returns null when nothing in the box names anything.
 */
export function splitFullName(value) {
  let segments = value
    .split(',')
    .map((s) => s.trim())
    .filter(namesSomething);
  if (!segments.length) return null;

  let suffix;
  if (segments.length > 1) {
    const found = segments.map((s) => (/\s/u.test(s) ? undefined : suffixFor(s)));
    const named = segments.filter((_, i) => found[i] === undefined);
    if (named.length > 0) {
      suffix = found.find((f) => f !== undefined);
      segments = named;
    }
  }

  // "Last, First Middle": the comma puts the last name first.
  if (segments.length === 2) {
    const given = (segments[1] || '').split(/\s+/u).filter(namesSomething);
    const trailing = given.length > 1 && !suffix ? suffixFor(given[given.length - 1] || '') : undefined;
    if (trailing) {
      suffix = trailing;
      given.pop();
    }
    segments = [given.join(' '), segments[0] || ''];
  }

  const words = segments.join(' ').split(/\s+/u).filter(namesSomething);
  if (!words.length) return null;
  if (!suffix && words.length > 1) {
    suffix = suffixFor(words[words.length - 1] || '');
    if (suffix) words.pop();
  }

  const last = words.pop() || '';
  const first = words.shift();
  const middle = words.length ? words.join(' ') : undefined;
  return { first, middle, last, suffix };
}

function words(value) {
  return value ? value.trim().split(/\s+/u).filter(Boolean) : [];
}

/**
 * Every other way to divide the same words into first, middle, and last.
 * The search tries these only when a middle name was typed, and only up to six words.
 */
export function otherDivisions(parts) {
  const f = words(parts.first);
  const m = words(parts.middle);
  const l = words(parts.last);
  if (!f.length || !m.length || !l.length) return [];
  const all = [...f, ...m, ...l];
  if (all.length > MAX_DIVISION_WORDS) return [];

  const given = [f, m, l].map((x) => x.join(' ')).join('|');
  const list = [];
  for (let firstEnd = 1; firstEnd < all.length; firstEnd++) {
    for (let lastStart = firstEnd; lastStart < all.length; lastStart++) {
      const d = {
        first: all.slice(0, firstEnd).join(' '),
        middle: all.slice(firstEnd, lastStart).join(' ') || undefined,
        last: all.slice(lastStart).join(' '),
      };
      if ([d.first, d.middle || '', d.last].join('|') === given) continue;
      list.push(d);
    }
  }
  return list;
}

const graphemes =
  typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function fold(value) {
  return value.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Characters as a reader counts them, after punctuation runs become one space. */
export function textLength(value) {
  const folded = fold(value);
  return graphemes ? Array.from(graphemes.segment(folded)).length : Array.from(folded).length;
}

/** The form the search compares: lowercase, accents off, punctuation read as a space. */
export function key(value) {
  return fold(value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase());
}

/**
 * The rule the search applies to one part.
 * - 'prefix-or-close': starts with what was typed, or is a close spelling
 * - 'prefix': starts with what was typed
 * - 'exact': is exactly what was typed (a last name under 3 letters)
 * - 'suffix': is the same suffix, however it's written
 * - 'prefix-two-word': a two-word part in another division; starts with only
 */
export function matchKind(part, value, divided = false) {
  if (divided && words(value).length > 1) return 'prefix-two-word';
  if (part === 'middle') return 'prefix';
  if (part === 'suffix') return 'suffix';
  if (part === 'last' && textLength(value) < 3) return 'exact';
  return 'prefix-or-close';
}

/** The query string the portal sends to GET /api/v1/licenses/search. */
export function searchQuery(parts) {
  const params = new URLSearchParams();
  for (const [name, value] of [
    ['firstName', parts.first],
    ['middleName', parts.middle],
    ['lastName', parts.last],
    ['suffix', parts.suffix],
  ]) {
    if (value) params.set(name, value);
  }
  params.set('limit', '10');
  return params.toString();
}

/** The portal stops before it searches when the box holds a digit. */
export function hasDigit(value) {
  return /\d/u.test(value);
}
