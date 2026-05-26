// sources/kstartup.js
// 창업진흥원 K-Startup 사업공고 OpenAPI
// 공공데이터포털: https://www.data.go.kr/data/15125364/openapi.do
// 발급 후 .env의 DATAGO_API_KEY에 설정

import fetch from 'node-fetch';
import 'dotenv/config';

const API_URL = 'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01';
const API_KEY = process.env.DATAGO_API_KEY;

// K-Startup API는 "접수중" 서버측 필터를 지원하지 않아 클라이언트에서 rcrt_prgs_yn === 'Y'로 거름.
// 페이지네이션 안전장치: 최대 페이지 상한, 연속으로 진행중 0건인 페이지가 누적되면 조기 종료.
const MAX_PAGES = 30;
const PER_PAGE = 100;
const STOP_AFTER_CONSEC_EMPTY_PAGES = 3;
const REQUEST_DELAY_MS = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchKStartupNotices(_opts = {}) {
  if (!API_KEY || API_KEY === '여기에_본인_키_입력') {
    console.warn('[kstartup] DATAGO_API_KEY 미설정 - 건너뜀');
    return [];
  }

  console.log(`[kstartup] 요청 중... (최대 ${MAX_PAGES}페이지, 연속 ${STOP_AFTER_CONSEC_EMPTY_PAGES}페이지 진행중 0건이면 조기 종료)`);

  const collected = [];
  let consecEmpty = 0;
  let lastTotal = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await sleep(REQUEST_DELAY_MS);

    const params = new URLSearchParams({
      serviceKey: API_KEY,
      page: String(page),
      perPage: String(PER_PAGE),
      returnType: 'json',
    });
    const url = `${API_URL}?${params.toString()}`;

    let items;
    try {
      const res = await fetch(url, { timeout: 15000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = data.data || [];
      if (lastTotal === null) lastTotal = data.totalCount;
    } catch (err) {
      console.error(`[kstartup] page=${page} 오류: ${err.message} - 중단`);
      break;
    }

    if (items.length === 0) {
      console.log(`[kstartup] page=${page} 응답 0건 - 전체 페이지 소진, 종료`);
      break;
    }

    const openItems = items.filter((it) => it && it.rcrt_prgs_yn === 'Y');
    console.log(`[kstartup] page=${page}: 받음 ${items.length}건 / 진행중 ${openItems.length}건`);

    collected.push(...openItems.map(normalizeKStartup).filter(Boolean));

    if (openItems.length === 0) {
      consecEmpty += 1;
      if (consecEmpty >= STOP_AFTER_CONSEC_EMPTY_PAGES) {
        console.log(`[kstartup] 연속 ${consecEmpty}페이지 진행중 0건 - 조기 종료 (page=${page})`);
        break;
      }
    } else {
      consecEmpty = 0;
    }

    if (items.length < PER_PAGE) {
      console.log(`[kstartup] page=${page}에서 마지막 페이지 도달 (${items.length} < ${PER_PAGE}) - 종료`);
      break;
    }
  }

  console.log(`[kstartup] 진행중 공고 누적 ${collected.length}건 (서버 totalCount=${lastTotal})`);
  return collected;
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
  const notices = await fetchKStartupNotices();
  console.log(`수집: ${notices.length}건`);
  console.log('샘플:', JSON.stringify(notices.slice(0, 2), null, 2));
}
