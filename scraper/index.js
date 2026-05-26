// index.js
// 메인 스크래퍼 실행 엔트리
// 사용: npm run scrape

import 'dotenv/config';
import { fetchBizinfoNotices } from './sources/bizinfo.js';
import { fetchBizinfoEvents } from './sources/bizinfo-event.js';
import { fetchKStartupNotices } from './sources/kstartup.js';
import { fetchManualEvents } from './manual-events.js';
import { filterAndRank } from './filter.js';
import { upsertNotices } from './db.js';

const TARGET_REGION = process.env.TARGET_REGION || '대전';

async function main() {
  console.log(`\n🌸 BeautyNotice 스크래퍼 시작 (${new Date().toLocaleString('ko-KR')})`);
  console.log(`   대상 지역: ${TARGET_REGION}\n`);

  // 1. 모든 소스에서 병렬로 수집
  const [bizinfo, events, kstartup, manualEvents] = await Promise.all([
    fetchBizinfoNotices({ region: TARGET_REGION }),
    fetchBizinfoEvents({ region: TARGET_REGION }),
    fetchKStartupNotices({ region: TARGET_REGION }),
    fetchManualEvents(),
  ]);

  console.log(`\n📥 수집 결과:`);
  console.log(`   비즈인포 지원사업: ${bizinfo.length}건`);
  console.log(`   비즈인포 행사정보: ${events.length}건`);
  console.log(`   K-Startup:        ${kstartup.length}건`);
  console.log(`   수동 등록 행사:    ${manualEvents.length}건`);

  const allNotices = [...bizinfo, ...events, ...kstartup, ...manualEvents];
  console.log(`   합계: ${allNotices.length}건`);

  // 2. 지역 필터 제거 — 모든 지역 데이터를 유지
  console.log(`\n📍 지역 필터 후: ${allNotices.length}건 (모든 지역)`);

  // 3. 뷰티 관련도 점수 + 정렬 + 중복 제거
  const ranked = filterAndRank(allNotices, { targetRegion: TARGET_REGION, dedupe: true });
  console.log(`✨ 뷰티 관련도 필터 후: ${ranked.length}건\n`);

  // 4. 상위 결과 미리보기
  console.log(`🏆 관련도 상위 5개:`);
  ranked.slice(0, 5).forEach((n, i) => {
    console.log(`  ${i + 1}. [${n.relevance}점] ${n.title.slice(0, 50)}`);
    console.log(`     키워드: ${(n.matchedKeywords || []).join(', ')}`);
    console.log(`     ${n.org} | ${n.region} | ~${n.endDate || '미정'}`);
  });

  // 5. DB 저장 (또는 파일 fallback)
  console.log(`\n💾 저장 중...`);
  const result = await upsertNotices(ranked);
  console.log(`   ${result.saved}건 저장 완료`);

  console.log(`\n✅ 완료\n`);
  return ranked;
}

main().catch(err => {
  console.error('실행 오류:', err);
  process.exit(1);
});
