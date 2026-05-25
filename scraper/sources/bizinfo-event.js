// sources/bizinfo-event.js
// 비즈인포 행사정보 API - 실제 필드명 반영 버전

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import 'dotenv/config';

const API_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoEventApi.do';
const API_KEY = process.env.BIZINFO_EVENT_API_KEY || process.env.BIZINFO_API_KEY || 'QP6yn2';

export async function fetchBizinfoEvents({ region = '대전', pageSize = 100 } = {}) {
  const params = new URLSearchParams({
    crtfcKey: API_KEY,
    dataType: 'json',
    searchCnt: String(pageSize),
  });

  const url = `${API_URL}?${params.toString()}`;
  console.log(`[bizinfo-event] 요청: ${url.replace(API_KEY, '***')}`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (BeautyNotice/0.1)',
        'Accept': 'application/json, application/xml',
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

    return items.map(normalizeEvent).filter(Boolean);
  } catch (err) {
    console.error(`[bizinfo-event] 오류: ${err.message}`);
    return [];
  }
}

function normalizeEvent(item) {
  if (!item) return null;

  // 실제 비즈인포 행사 API 필드명 매핑
  const title = item.nttNm || item.title || '';
  const summary = (item.nttCn || item.description || '').replace(/<[^>]+>/g, '').trim();
  const org = item.originEngnNm || item.hostInsttNm || '';
  const venue = item.areaNm || item.eventPlaceNm || '';
  const field = item.pldirSportRealmLclasCodeNm || '';
  const hashtags = item.hashtags || '';
  const url = item.bizinfoUrl || item.orginUrlAdres || item.link || '';
  const fullLink = url.startsWith('/')
    ? `https://www.bizinfo.go.kr${url}`
    : url;

  // 행사 분류 - 제목과 해시태그 둘 다 확인
  const allText = `${title} ${hashtags} ${field}`.toLowerCase();
  let eventType = '교육·세미나';
  if (/엑스포|expo|박람회|페어|fair|전시/i.test(allText)) eventType = '전시·박람회';
  else if (/세미나|컨퍼런스|포럼|conference/i.test(allText)) eventType = '교육·세미나';
  else if (/교육|강의|강좌/i.test(allText)) eventType = '교육·세미나';

  // 행사기간 (eventBeginEndDe) 또는 접수기간 (rcceptPd)
  const { startDate, endDate } = parsePeriod(item.eventBeginEndDe || item.rcceptPd || '');

  // 지역 추출: 해시태그 + 제목 + 장소 모두에서 찾기
  const region = extractRegion(title, hashtags, venue);

  return {
    source: 'bizinfo-event',
    sourceId: String(item.eventInfoId || item.seq || Math.random()),
    category: eventType,
    title: title.trim(),
    summary: summary.slice(0, 300),
    org,
    executor: org,
    region,
    venue,
    field,
    hashtags,
    target: '',
    startDate,
    endDate,
    posted: item.registDe ? toISODate(item.registDe) : new Date().toISOString(),
    url: fullLink,
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
  const digits = String(s).replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function extractRegion(title, hashtags, venue) {
  const text = `${title} ${hashtags} ${venue}`;
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
  };

  for (const [short, names] of Object.entries(regionMap)) {
    if (names.some(name => text.includes(name))) return short;
  }
  return '전국';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('비즈인포 행사 API 테스트...');
  const events = await fetchBizinfoEvents({ region: '대전' });
  console.log(`수집된 행사: ${events.length}건`);
  console.log('샘플:', JSON.stringify(events.slice(0, 2), null, 2));
}