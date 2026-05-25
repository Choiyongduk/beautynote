// sources/kstartup.js
// 창업진흥원 K-Startup 사업공고 OpenAPI
// 공공데이터포털: https://www.data.go.kr/data/15125364/openapi.do
// 발급 후 .env의 DATAGO_API_KEY에 설정

import fetch from 'node-fetch';
import 'dotenv/config';

const API_URL = 'https://apis.data.go.kr/B552735/kisedKstartupService/getAnnouncementInformation';
const API_KEY = process.env.DATAGO_API_KEY;

export async function fetchKStartupNotices({ region = '대전', pageSize = 100 } = {}) {
  if (!API_KEY || API_KEY === '여기에_본인_키_입력') {
    console.warn('[kstartup] DATAGO_API_KEY 미설정 - 건너뜀');
    return [];
  }

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    page: '1',
    perPage: String(pageSize),
    returnType: 'json',
  });

  const url = `${API_URL}?${params.toString()}`;
  console.log(`[kstartup] 요청 중...`);

  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    // 응답 구조: { data: [ {...} ], currentCount, totalCount, ... }
    const items = data.data || [];

    return items
      .map(normalizeKStartup)
      .filter(Boolean)
      .filter(n => !region || n.region === region || n.region === '전국');
  } catch (err) {
    console.error(`[kstartup] 오류: ${err.message}`);
    return [];
  }
}

function normalizeKStartup(item) {
  if (!item) return null;

  return {
    source: 'kstartup',
    sourceId: String(item.pbanc_sn || item.id || Math.random()),
    category: '지원사업',
    title: (item.biz_pbanc_nm || item.title || '').trim(),
    summary: (item.pbanc_ctnt || item.description || '').trim().slice(0, 300),
    org: item.pbanc_ntrp_nm || item.supt_biz_clsfc || '',
    executor: item.biz_prch_dprt_nm || '',
    region: item.supt_regin || '전국',
    field: item.supt_biz_clsfc || '',
    target: item.aply_trgt || '',
    startDate: toISODate(item.pbanc_rcpt_bgng_dt),
    endDate: toISODate(item.pbanc_rcpt_end_dt),
    posted: item.creat_dt || new Date().toISOString(),
    url: item.detl_pg_url || `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${item.pbanc_sn}`,
    raw: item,
  };
}

function toISODate(s) {
  if (!s) return null;
  const digits = String(s).replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('K-Startup API 테스트...');
  const notices = await fetchKStartupNotices({ region: '대전' });
  console.log(`수집: ${notices.length}건`);
  console.log('샘플:', JSON.stringify(notices.slice(0, 2), null, 2));
}
