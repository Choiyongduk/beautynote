// 공고 텍스트 정화: HTML 태그 제거 + HTML 엔티티 디코딩 + URL 제거 + 공백 정리

const NAMED_ENTITIES = {
  nbsp: ' ', lt: '<', gt: '>', amp: '&', quot: '"', apos: "'",
  ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  middot: '·', copy: '©', reg: '®', trade: '™',
  laquo: '«', raquo: '»',
};

export function decodeEntities(s) {
  if (!s) return s;
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) => {
      const lookup = NAMED_ENTITIES[name.toLowerCase()];
      return lookup !== undefined ? lookup : m;
    });
}

export function stripHtmlTags(s) {
  if (!s) return s;
  return String(s).replace(/<[^>]+>/g, '');
}

export function stripUrls(s) {
  if (!s) return s;
  return String(s).replace(/https?:\/\/\S+/gi, '');
}

export function collapseWhitespace(s) {
  if (!s) return s;
  return String(s)
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ ?\n ?/g, '\n')
    .trim();
}

export function cleanSummary(s) {
  if (!s) return '';
  return collapseWhitespace(stripUrls(decodeEntities(stripHtmlTags(s))));
}

export function cleanTitle(s) {
  if (!s) return '';
  return collapseWhitespace(decodeEntities(stripHtmlTags(s)));
}
