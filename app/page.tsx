'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Bell, Bookmark, BookmarkCheck, MapPin, Building2, Sparkles, ExternalLink, Clock, TrendingUp, X } from 'lucide-react';

const CATEGORIES = ['전체', '지원사업', '전시·박람회', '교육·세미나'];
const REGIONS = ['전국', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const SORT_OPTIONS = [
  { key: 'deadline', label: '마감임박순' },
  { key: 'relevance', label: '관련도순' },
  { key: 'posted', label: '최신순' },
];

function daysUntil(dateStr) {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function isNoticeExpired(endDate) {
  if (!endDate) return false; // 상시 공고는 만료되지 않음
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(endDate);
  return deadline < today; // 오늘보다 이전이면 만료됨
}

function DeadlineBadge({ deadline }) {
  if (!deadline) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tracking-tight bg-stone-100 text-stone-500">
        <Clock size={11} strokeWidth={2.5} />
        상시
      </span>
    );
  }
  const days = daysUntil(deadline);
  let style = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  let label = `D-${days}`;
  if (days <= 3 && days >= 0) style = 'bg-red-50 text-red-700 border border-red-200';
  else if (days <= 7 && days >= 0) style = 'bg-amber-50 text-amber-700 border border-amber-200';
  if (days < 0) {
    style = 'bg-stone-100 text-stone-400';
    label = '마감';
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tracking-tight ${style}`}>
      <Clock size={11} strokeWidth={2.5} />
      {label}
    </span>
  );
}

function CategoryPill({ category }) {
  const map = {
    '지원사업': 'bg-rose-50 text-rose-700 border-rose-100',
    '전시·박람회': 'bg-violet-50 text-violet-700 border-violet-100',
    '교육·세미나': 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium border tracking-tight ${map[category] || 'bg-stone-50 text-stone-600 border-stone-200'}`}>
      {category}
    </span>
  );
}

function NoticeCard({ notice, bookmarked, onToggleBookmark, onClick }) {
  return (
    <article
      onClick={onClick}
      className="group relative bg-white border border-stone-200/80 rounded-2xl p-5 hover:border-stone-300 hover:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryPill category={notice.category} />
          <DeadlineBadge deadline={notice.endDate} />
          {notice.region === '대전' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
              대전
            </span>
          )}
          {notice.relevance >= 50 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-rose-500 to-pink-500 text-white">
              <Sparkles size={9} strokeWidth={2.5} />
              추천
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBookmark(notice.sourceId); }}
          className="flex-shrink-0 p-1.5 -m-1.5 rounded-lg hover:bg-stone-50 transition-colors"
        >
          {bookmarked ? (
            <BookmarkCheck size={18} className="text-rose-500" strokeWidth={2.2} fill="currentColor" />
          ) : (
            <Bookmark size={18} className="text-stone-400 group-hover:text-stone-600" strokeWidth={2} />
          )}
        </button>
      </div>

      <h3 className="font-serif text-[17px] leading-snug text-stone-900 mb-2 tracking-tight">
        {notice.title}
      </h3>

      {notice.summary && (
        <p className="text-[13px] text-stone-600 leading-relaxed mb-4 line-clamp-2">
          {notice.summary}
        </p>
      )}

      <div className="flex items-center gap-3 text-[11.5px] text-stone-500 mb-3 flex-wrap">
        {notice.org && (
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} strokeWidth={2} />
            {notice.org}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} strokeWidth={2} />
          {notice.region || '전국'}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <span className="text-[11px] text-stone-400">
          관련도 {notice.relevance}점
        </span>
        {notice.endDate && (
          <span className="text-[11px] text-stone-400">
            ~{notice.endDate.slice(5).replace('-', '/')}
          </span>
        )}
      </div>
    </article>
  );
}

function DetailModal({ notice, onClose, bookmarked, onToggleBookmark }) {
  if (!notice) return null;
  const days = daysUntil(notice.endDate);
  return (
    <div
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-stone-100 px-6 py-4 flex items-center justify-between">
          <CategoryPill category={notice.category} />
          <button onClick={onClose} className="p-1.5 -m-1.5 rounded-lg hover:bg-stone-50">
            <X size={20} strokeWidth={2} className="text-stone-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <DeadlineBadge deadline={notice.endDate} />
            <span className="text-[11px] text-stone-500">관련도 {notice.relevance}점</span>
          </div>

          <h2 className="font-serif text-2xl leading-tight text-stone-900 mb-4 tracking-tight">
            {notice.title}
          </h2>

          {notice.summary && (
            <p className="text-[14.5px] text-stone-700 leading-relaxed mb-6 whitespace-pre-line">
              {notice.summary}
            </p>
          )}

          <div className="bg-stone-50 rounded-2xl p-5 space-y-3 mb-6">
            {notice.org && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-[12px] text-stone-500 flex-shrink-0">주관기관</span>
                <span className="text-[13.5px] text-stone-900 font-medium text-right">{notice.org}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-stone-500">지역</span>
              <span className="text-[13.5px] text-stone-900 font-medium">{notice.region}</span>
            </div>
            {notice.endDate && (
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-stone-500">접수마감</span>
                <span className="text-[13.5px] text-stone-900 font-medium">
                  {notice.endDate} {days > 0 && `(${days}일 남음)`}
                </span>
              </div>
            )}
          </div>

          {notice.matchedKeywords && notice.matchedKeywords.length > 0 && (
            <div className="flex gap-2 mb-6 flex-wrap">
              {notice.matchedKeywords.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[11.5px] font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => onToggleBookmark(notice.sourceId)}
              className="flex-shrink-0 px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
            >
              {bookmarked ? (
                <BookmarkCheck size={18} className="text-rose-500" fill="currentColor" />
              ) : (
                <Bookmark size={18} className="text-stone-600" />
              )}
            </button>
            <a
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              원문 공고 보기
              <ExternalLink size={15} strokeWidth={2.2} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('전체');
  const [selectedRegions, setSelectedRegions] = useState(['대전', '전국']);
  const [sort, setSort] = useState('deadline');
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showClosedNotices, setShowClosedNotices] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetch('/notices.json')
      .then(res => res.json())
      .then(data => {
        setNotices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('데이터 로드 실패:', err);
        setLoading(false);
      });
  }, []);

  const toggleBookmark = (id) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = [...notices];
    
    // 마감 공고 필터링
    if (!showClosedNotices) {
      // 진행중인 공고만 표시 (마감되지 않은 공고)
      list = list.filter(n => !isNoticeExpired(n.endDate));
    } else {
      // 마감된 공고만 표시
      list = list.filter(n => isNoticeExpired(n.endDate));
    }
    
    if (category !== '전체') list = list.filter(n => n.category === category);
    if (selectedRegions.length > 0) {
      list = list.filter(n => selectedRegions.includes(n.region || '전국'));
    }
    if (showBookmarksOnly) list = list.filter(n => bookmarks.has(n.sourceId));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.summary || '').toLowerCase().includes(q) ||
        (n.matchedKeywords || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (sort === 'deadline') list.sort((a, b) => {
      if (!a.endDate) return 1;
      if (!b.endDate) return -1;
      return a.endDate.localeCompare(b.endDate);
    });
    else if (sort === 'relevance') list.sort((a, b) => b.relevance - a.relevance);
    else if (sort === 'posted') list.sort((a, b) => (b.posted || '').localeCompare(a.posted || ''));
    return list;
  }, [notices, category, selectedRegions, sort, search, showBookmarksOnly, showClosedNotices, bookmarks]);

  const urgentCount = notices.filter(n => {
    const d = daysUntil(n.endDate);
    return d >= 0 && d <= 7;
  }).length;

  const closedCount = notices.filter(n => isNoticeExpired(n.endDate)).length;
  const activeNoticesCount = notices.filter(n => !isNoticeExpired(n.endDate)).length;
  const activeDaejeonCount = notices.filter(n => !isNoticeExpired(n.endDate) && n.region === '대전').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/30 via-stone-50/50 to-white">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Pretendard:wght@400;500;600;700&display=swap');
        body { font-family: 'Pretendard', -apple-system, sans-serif; }
        .font-serif { font-family: 'Noto Serif KR', serif; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <h1 className="font-serif text-xl text-stone-900 tracking-tight">
                  뷰티노트 <span className="text-rose-500">·</span> <span className="text-[14px] text-stone-500 font-sans">대전</span>
                </h1>
              </div>
              <p className="text-[11.5px] text-stone-500 ml-9">
                매일 자동 업데이트 · {activeNoticesCount}건 진행중
              </p>
            </div>
            <button className="relative p-2 rounded-xl hover:bg-stone-50 transition-colors">
              <Bell size={20} className="text-stone-700" strokeWidth={2} />
              {urgentCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {urgentCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={2} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="공고·기관·키워드 검색"
              className="w-full pl-10 pr-4 py-2.5 bg-stone-100/80 border-0 rounded-xl text-[13.5px] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-stone-200 transition-all"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${
                  category === cat
                    ? 'bg-stone-900 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="w-px bg-stone-200 mx-1" />
            <button
              onClick={() => setShowClosedNotices(v => !v)}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${
                showClosedNotices
                  ? 'bg-stone-500 text-white'
                  : 'bg-white border border-stone-200 text-stone-600'
              }`}
            >
              <Clock size={12} strokeWidth={2} />
              {showClosedNotices ? `마감 ${closedCount}` : '마감'}
            </button>
            {!showClosedNotices && (
              <button
                onClick={() => setShowBookmarksOnly(v => !v)}
                className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${
                  showBookmarksOnly
                    ? 'bg-rose-500 text-white'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                <Bookmark size={12} fill={showBookmarksOnly ? 'currentColor' : 'none'} strokeWidth={2.2} />
                저장
              </button>
            )}
          </div>

          <div className="mt-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
            <div className="flex gap-2 min-w-max">
              {REGIONS.map(region => {
                const isSelected = selectedRegions.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => {
                      setSelectedRegions(prev => {
                        if (prev.includes(region)) {
                          return prev.filter(r => r !== region);
                        }
                        return [...prev, region];
                      });
                    }}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-rose-500 text-white border border-rose-500'
                        : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pt-5">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-rose-500/20 blur-2xl" />
          <div className="absolute -right-2 -bottom-6 w-24 h-24 rounded-full bg-pink-400/15 blur-xl" />
          <div className="relative">
            <p className="text-[11px] text-stone-400 mb-1 tracking-wider uppercase">Today</p>
            <p className="font-serif text-2xl mb-3 tracking-tight">
              {loading ? '로딩 중...' : `${activeNoticesCount}건의 공고가 진행중이에요`}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-stone-300">마감임박 {urgentCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={11} className="text-rose-300" strokeWidth={2.5} />
                <span className="text-stone-300">선택 지역 {selectedRegions.length}개</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={11} className="text-rose-300" strokeWidth={2.5} />
                <span className="text-stone-300">
                  대전 {activeDaejeonCount}건
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 mb-3">
          <p className="text-[12.5px] text-stone-500">
            <span className="text-stone-900 font-semibold">{filtered.length}</span>건
          </p>
          <div className="flex gap-1">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`px-2.5 py-1 rounded-md text-[11.5px] transition-colors ${
                  sort === opt.key
                    ? 'text-stone-900 font-semibold'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-5 pb-20">
        {loading ? (
          <div className="text-center py-20 text-stone-400 text-sm">
            데이터 불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400 text-sm">
            조건에 맞는 공고가 없어요
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(notice => (
              <NoticeCard
                key={notice.sourceId}
                notice={notice}
                bookmarked={bookmarks.has(notice.sourceId)}
                onToggleBookmark={toggleBookmark}
                onClick={() => setDetail(notice)}
              />
            ))}
          </div>
        )}
      </main>

      <DetailModal
        notice={detail}
        onClose={() => setDetail(null)}
        bookmarked={detail ? bookmarks.has(detail.sourceId) : false}
        onToggleBookmark={toggleBookmark}
      />

      <footer className="text-center py-8 text-[11px] text-stone-400 tracking-tight">
        뷰티노트 · 와이프 전용 큐레이션
      </footer>
    </div>
  );
}
