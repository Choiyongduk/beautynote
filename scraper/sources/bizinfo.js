// sources/bizinfo.js
// 비즈인포 지원사업 API - 실제 필드명 반영 + hashtags 파라미터 제거

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import 'dotenv/config';

const API_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';
const API_KEY = process.env.BIZINFO_API_KEY || 'QP6yn2';

export async function fetchBizinfoNotices({ pageSize = 100 } = {}) {
  // 지역 필터링은 서버가 안 받아주므로, 전체 받고 클라이언트에서 필터
  const params = new URLSearchParams({
    crtfcKey: API_KEY,
    dataType: 'json',
    searchCnt: String(pageSize),
  });

  const url = `${API_URL}?${params.toString()}`;
  console.log(`[bizinfo] 요청: ${url.replace(API_KEY, '***')}`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (BeautyNotice/0.1)',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    let items = [];

    if (contentType.includes('json')) {
      const data = await res.json();
      items = data.jsonArray || data.items || data.data || [];
    } else {
      const xml = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      const parsed = parser.parse(xml);
      items = parsed?.rss?.channel?.item || [];
      if (!Array.isArray(items)) items = [items];
    }

    return items.map(normalizeNotice).filter(Boolean);
  } catch (err) {
    console.error(`[bizinfo] 오류: ${err.message}`);
    return [];
  }
}

function normalizeNotice(item) {
  if (!item) return null;

  // 실제 비즈인포 지원사업 API 필드명 매핑
  const title = item.pblancNm || item.title || '';
  const summary = (item.bsnsSumryCn || item.description || '').replace(/<[^>]+>/g, '').trim();
  const org = item.jrsdInsttNm || item.refrncNm || '';
  const executor = item.excInsttNm || '';
  const field = item.pldirSportRealmLclasCodeNm || '';
  const target = item.trgetNm || '';
  const hashtags = item.hashtags || '';

  // URL 조합 - 공고ID로 상세 페이지 URL 생성
  let url = '';
  if (item.pblancId) {
    url = `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${item.pblancId}`;
  } else if (item.pblancUrl) {
    url = item.pblancUrl.startsWith('/')
      ? `https://www.bizinfo.go.kr${item.pblancUrl}`
      : item.pblancUrl;
  }

  // 접수기간 파싱
  const { startDate, endDate } = parsePeriod(item.reqstBeginEndDe || item.rcceptPd || '');

  // 지역 추출: 제목 + 해시태그 + 기관명 + 요약 모두 확인
  const region = extractRegion(title, hashtags, org, summary);
  const category = classifyBizinfoCategory(title, hashtags, field, summary);

  return {
    source: 'bizinfo',
    sourceId: String(item.pblancId || item.seq || Math.random()),
    category,
    title: title.trim(),
    summary: summary.slice(0, 300),
    org,
    executor,
    region,
    field,
    target,
    hashtags,
    startDate,
    endDate,
    posted: item.creatPnttm || new Date().toISOString(),
    url,
    raw: item,
  };
}

function parsePeriod(period) {
  if (!period) return { startDate: null, endDate: null };
  const cleaned = String(period).replace(/[~\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const dates = cleaned.match(/\d{4}[\-\.]?\d{2}[\-\.]?\d{2}/g) || [];
  return {
    startDate: dates[0] ? toISODate(dates[0]) : null,
    endDate: dates[1] ? toISODate(dates[1]) : null,
  };
}

function toISODate(s) {
  if (!s) return null;
  const digits = String(s).replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function classifyBizinfoCategory(title, hashtags, field, summary) {
  const allText = `${title} ${hashtags} ${field} ${summary}`.toLowerCase();
  
  // 지원사업 우선 판정
  const supportTerms = ['지원사업', '융자', '자금'];
  const isSupport = supportTerms.some(term => allText.includes(term));
  
  // 명확한 전시 행사 키워드만 ("참가기업 모집" 제외)
  const expoTerms = ['박람회', '전시회', '엑스포', '페어', '전시 부스'];
  const isExpo = expoTerms.some(term => allText.includes(term));
  
  // 교육 키워드
  const eduTerms = ['세미나', '컨퍼런스', '포럼', 'conference', '교육', '강의', '강좌', '워크숍'];
  const isEdu = eduTerms.some(term => allText.includes(term));
  
  // 판정 로직: 지원사업 키워드가 있으면 지원사업으로 우선 분류
  if (isSupport) return '지원사업';
  if (isExpo) return '전시·박람회';
  if (isEdu) return '교육·세미나';
  return '지원사업';
}

function extractRegion(title, hashtags, org, summary) {
  const text = `${title} ${hashtags} ${org} ${summary}`;
  const regionMap = {
    '대전': ['대전', '대전광역시'],
    '서울': ['서울', '서울특별시'],
    '부산': ['부산', '부산광역시'],
    '대구': ['대구', '대구광역시'],
    '인천': ['인천', '인천광역시'],
    '광주': ['광주', '광주광역시'],
    '울산': ['울산', '울산광역시'],
    '세종': ['세종'],
    '경기': ['경기', '경기도'],
    '강원': ['강원', '강원도', '강원특별자치도'],
    '충북': ['충북', '충청북도'],
    '충남': ['충남', '충청남도'],
    '전북': ['전북', '전라북도'],
    '전남': ['전남', '전라남도'],
    '경북': ['경북', '경상북도'],
    '경남': ['경남', '경상남도'],
    '제주': ['제주', '제주도', '제주특별자치도'],
    '전국': ['전국'],
  };

  const findRegion = (source) => {
    const normalized = String(source || '');
    for (const [short, names] of Object.entries(regionMap)) {
      if (names.some(name => normalized.includes(name))) return short;
    }
    return null;
  };

  const bracketMatches = String(title || '').match(/\[([^\]]+)\]/g) || [];
  for (const match of bracketMatches) {
    const content = match.slice(1, -1);
    const region = findRegion(content);
    if (region) return region;
  }

  return findRegion(text) || '전국';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('비즈인포 지원사업 API 테스트...');
  const notices = await fetchBizinfoNotices();
  console.log(`수집된 공고: ${notices.length}건`);
  console.log('샘플:', JSON.stringify(notices.slice(0, 2), null, 2));
}