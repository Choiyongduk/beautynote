// filter.js
// C안: 대전은 5점부터 (넓게), 전국은 15점부터 (좋은 것만)

const KEYWORD_WEIGHTS = {
  // 직접 관련 (뷰티 산업)
  '뷰티': 30, '미용': 30, '헤어': 30, '네일': 30, '에스테틱': 30,
  '화장품': 25, '코스메틱': 25, '메이크업': 25, '왁싱': 25, '속눈썹': 25,
  '피부': 20, '두피': 20, 'K-뷰티': 35,

  // 간접 관련 (사업자/창업)
  '소상공인': 15, '여성기업': 18, '여성가장': 18, '1인기업': 12,
  '여성CEO': 15, '여성창업': 15, '창업': 10, '소공인': 10,
  '서비스업': 8, '점포': 10, '상점': 8,

  // 일반 지원
  '경영': 5, '마케팅': 8, '디지털': 6, '스마트상점': 12,
  '브랜드': 8, '상표': 6, '시설개선': 10, '환경개선': 10,
  '교육': 4, '컨설팅': 6, '자금': 7, '융자': 7, '보증': 5,
};

const EXCLUDE_KEYWORDS = [
  '제조업', '농업', '축산', '어업', '임업',
  '반도체', '바이오', '소프트웨어',
  '연구개발', 'R&D', '특허출원',
  '청년농업인', '귀농', '귀촌',
  '항공우주', '방산',
];

export function scoreNotice(notice) {
  const text = [
    notice.title, notice.summary, notice.field,
    notice.target, notice.org, notice.hashtags,
  ].filter(Boolean).join(' ');

  const lower = text.toLowerCase();

  const excluded = EXCLUDE_KEYWORDS.find(kw => lower.includes(kw.toLowerCase()));
  if (excluded) {
    return { ...notice, relevance: 0, matchedKeywords: [], excluded };
  }

  let score = 0;
  const matched = [];
  for (const [kw, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (lower.includes(kw.toLowerCase())) {
      score += weight;
      matched.push(kw);
    }
  }

  const hasDirectMatch = matched.some(kw => KEYWORD_WEIGHTS[kw] >= 20);
  if (hasDirectMatch) score += 15;

  const relevance = Math.min(100, score);
  return { ...notice, relevance, matchedKeywords: matched };
}

/**
 * C안 필터: 대전은 5점부터, 전국은 15점부터
 */
export function filterAndRank(notices, { targetRegion = '대전', dedupe = true } = {}) {
  let scored = notices.map(scoreNotice);

  scored = scored.filter(n => {
    if (n.relevance === 0) return false;
    // 대상 지역(대전) 공고는 점수 낮아도 통과
    if (n.region === targetRegion) return n.relevance >= 5;
    // 전국 공고는 점수 높은 것만
    if (n.region === '전국') return n.relevance >= 15;
    // 다른 지역은 제외
    return false;
  });

  if (dedupe) {
    const seen = new Map();
    for (const n of scored) {
      const key = n.title.replace(/\s+/g, '').toLowerCase();
      if (!seen.has(key) || seen.get(key).relevance < n.relevance) {
        seen.set(key, n);
      }
    }
    scored = [...seen.values()];
  }

  return scored.sort((a, b) => {
    // 1순위: 대전 공고 우선
    if (a.region === targetRegion && b.region !== targetRegion) return -1;
    if (b.region === targetRegion && a.region !== targetRegion) return 1;
    // 2순위: 관련도
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    // 3순위: 마감일 임박순
    if (a.endDate && b.endDate) return a.endDate.localeCompare(b.endDate);
    return 0;
  });
}

// 호환성 유지용 (기존 코드에서 호출하면)
export function filterByRegion(notices, targetRegion = '대전') {
  return notices.filter(n =>
    !n.region || n.region === targetRegion || n.region === '전국'
  );
}