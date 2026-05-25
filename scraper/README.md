# 🌸 BeautyNotice 스크래퍼

대전 뷰티 사업자(미용/헤어/네일/에스테틱)를 위한 정부지원사업·전시·세미나 자동 수집기.

## 데이터 소스

| 소스 | 종류 | 인증 |
|------|------|------|
| 비즈인포 지원사업 API | 정부·지자체 지원사업 공고 | 데모 키 `QP6yn2` 또는 발급 |
| 비즈인포 행사정보 API | 교육·세미나·전시·박람회 | 데모 키 `QP6yn2` 또는 발급 |
| K-Startup OpenAPI | 창업 지원사업 | 공공데이터포털 발급 (무료) |

## 설치

```bash
cd scraper
npm install
cp .env.example .env
# .env 파일 열어서 API 키 채우기
```

## API 키 발급

### 1. 비즈인포 (기업마당)
1. https://www.bizinfo.go.kr 접속
2. 활용정보 → 정책정보 개방 → "지원사업정보 API" 활용신청
3. 발급된 `crtfcKey`를 `.env`의 `BIZINFO_API_KEY`에 입력
4. **테스트 단계는 데모 키 `QP6yn2`로 가능** (제한적이지만 동작 확인용)

### 2. K-Startup (공공데이터포털)
1. https://www.data.go.kr 회원가입
2. "창업진흥원_K-Startup" 검색 → 활용신청 (자동 승인, 무료)
3. 인증키를 `.env`의 `DATAGO_API_KEY`에 입력

## 실행

```bash
# 전체 수집 (모든 소스)
npm run scrape

# 개별 소스 테스트
npm run test-bizinfo
npm run test-event
npm run test-kstartup
```

## 출력

- Supabase 미설정 시: `output/notices-YYYY-MM-DD.json` 파일로 저장
- Supabase 설정 시: `notices` 테이블에 upsert (중복 무시)

## 필터링 로직

`filter.js` 참조. 키워드 가중치 기반 점수 산출:

- **직접 관련 (20~30점):** 뷰티, 미용, 헤어, 네일, 화장품, 에스테틱
- **간접 관련 (10~18점):** 소상공인, 여성기업, 1인기업, 창업
- **일반 지원 (5~10점):** 시설개선, 마케팅, 디지털전환
- **제외 키워드:** 농업, 어업, 반도체, R&D 등

기본 통과 기준: 15점 이상.

## Supabase 테이블 스키마 (다음 단계)

```sql
create table notices (
  id bigserial primary key,
  source text not null,
  source_id text not null,
  category text not null,         -- 지원사업 / 전시·박람회 / 교육·세미나
  title text not null,
  summary text,
  org text,
  executor text,
  region text,
  field text,
  target text,
  venue text,                     -- 행사 장소 (행사 전용)
  start_date date,
  end_date date,
  posted timestamptz,
  url text,
  relevance integer,
  matched_keywords text[],
  created_at timestamptz default now(),
  unique (source, source_id)
);

create index on notices (end_date);
create index on notices (relevance desc);
```

## 자동화 (다음 단계)

Vercel Cron 또는 GitHub Actions로 매일 아침 8시 실행:

```yaml
# .github/workflows/scrape.yml
on:
  schedule:
    - cron: '0 23 * * *'  # UTC 23시 = KST 8시
```

## 트러블슈팅

- **빈 결과:** `dataType=json` 미지원이면 RSS(XML)로 응답 → 코드가 자동 폴백
- **403/401:** API 키 확인. 비즈인포는 발급 후 활성화까지 1~2시간 소요
- **CORS:** 서버사이드 실행이므로 영향 없음 (브라우저에서 직접 호출 X)
