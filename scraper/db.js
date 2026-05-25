// db.js
// Supabase 저장 (다음 단계에서 Supabase 세팅 후 활성화)

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * 공고 일괄 저장 (upsert: 중복은 무시, 새 것만 추가)
 * Supabase에 미리 만들어둘 테이블 스키마는 README 참조
 */
export async function upsertNotices(notices) {
  if (!supabase) {
    console.warn('[db] Supabase 미설정 - JSON 파일로만 저장');
    return saveToFile(notices);
  }

  // raw 필드 제거 (DB에 불필요)
  const records = notices.map(({ raw, ...rest }) => ({
    ...rest,
    matched_keywords: rest.matchedKeywords || [],
    matchedKeywords: undefined,
  }));

  const { data, error } = await supabase
    .from('notices')
    .upsert(records, {
      onConflict: 'source,sourceId',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('[db] Supabase 오류:', error.message);
    return { saved: 0, error };
  }

  return { saved: records.length };
}

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function saveToFile(notices) {
  // 앱의 public/notices.json에 저장
  const publicDir = path.join(__dirname, '../public');
  await fs.mkdir(publicDir, { recursive: true });
  const file = path.join(publicDir, 'notices.json');
  await fs.writeFile(file, JSON.stringify(notices, null, 2), 'utf-8');
  console.log(`[db] 파일 저장: ${file}`);
  return { saved: notices.length, file };
}
