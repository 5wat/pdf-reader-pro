export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  visitorId: string;
  sessionId: string;
  category: 'tool' | 'document' | 'theme' | 'navigation' | 'session';
  action: string;
  label?: string;
  value?: number;
}

export interface VisitorSession {
  sessionId: string;
  visitorId: string;
  startTime: number;
  lastActive: number;
  durationSeconds: number;
  referrer: string;
  referrerCategory: string;
  device: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screen: string;
  language: string;
}

export interface AnalyticsSummary {
  period: 'today' | '7d' | '30d' | 'all';
  totalVisits: number;
  uniqueVisitors: number;
  avgDurationSeconds: number;
  totalExports: number;
  activeVisitorsNow: number;
  bounceRate: number;
  dailyVisits: Array<{ date: string; visits: number; uniques: number; avgDuration: number }>;
  referrers: Array<{ name: string; category: string; count: number; percentage: number }>;
  toolsRank: Array<{ id: string; name: string; count: number; percentage: number; color: string }>;
  deviceBreakdown: Array<{ type: string; count: number; percentage: number }>;
  osBreakdown: Array<{ name: string; count: number; percentage: number }>;
  browserBreakdown: Array<{ name: string; count: number; percentage: number }>;
  durationDistribution: Array<{ label: string; count: number; percentage: number }>;
  actionsSummary: {
    documentsLoaded: number;
    documentsExported: number;
    documentsPrinted: number;
    merges: number;
    textEdits: number;
    stampsAdded: number;
    signaturesAdded: number;
    shapesDrawn: number;
  };
}

const STORAGE_KEY_VID = 'propdf_vid';
const STORAGE_KEY_SID = 'propdf_sid';
const STORAGE_KEY_SESSIONS = 'propdf_analytics_sessions_v1';
const STORAGE_KEY_EVENTS = 'propdf_analytics_events_v1';

// Device & Client Environment Detectors
function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  const ua = navigator.userAgent.toLowerCase();
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua);
  if (isTablet || (width >= 640 && width <= 1024)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|phone|iemobile/.test(ua) || width < 640) return 'mobile';
  return 'desktop';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Інша';
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Інший';
}

function detectReferrer(): { referrer: string; category: string } {
  const searchParams = new URLSearchParams(window.location.search);
  const utmSource = searchParams.get('utm_source');
  if (utmSource) {
    return { referrer: `Кампанія: ${utmSource}`, category: 'Кампанія (UTM)' };
  }

  const rawRef = document.referrer;
  if (!rawRef) {
    return { referrer: 'Прямий перехід', category: 'Прямий' };
  }

  try {
    const url = new URL(rawRef);
    const host = url.hostname.toLowerCase();

    if (host.includes('google.')) return { referrer: 'Google Пошук', category: 'Пошук' };
    if (host.includes('bing.')) return { referrer: 'Bing Пошук', category: 'Пошук' };
    if (host.includes('duckduckgo.')) return { referrer: 'DuckDuckGo', category: 'Пошук' };
    if (host.includes('t.me') || host.includes('telegram')) return { referrer: 'Telegram', category: 'Месенджери' };
    if (host.includes('facebook.') || host.includes('fb.com')) return { referrer: 'Facebook', category: 'Соцмережі' };
    if (host.includes('instagram.')) return { referrer: 'Instagram', category: 'Соцмережі' };
    if (host.includes('twitter.') || host.includes('x.com')) return { referrer: 'X / Twitter', category: 'Соцмережі' };
    if (host.includes('linkedin.')) return { referrer: 'LinkedIn', category: 'Соцмережі' };
    if (host.includes('youtube.')) return { referrer: 'YouTube', category: 'Соцмережі' };
    if (host.includes('github.com')) return { referrer: 'GitHub', category: 'Партнери' };
    if (host.includes('infinityfree.')) return { referrer: 'InfinityFree', category: 'Хостинг' };

    return { referrer: host, category: 'Зовнішні сайти' };
  } catch {
    return { referrer: 'Прямий перехід', category: 'Прямий' };
  }
}

// Storage helpers
function getStoredSessions(): VisitorSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSessions(sessions: VisitorSession[]): void {
  try {
    // Keep up to latest 500 sessions locally
    const trimmed = sessions.slice(-500);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save sessions to localStorage', e);
  }
}

function getStoredEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredEvents(events: AnalyticsEvent[]): void {
  try {
    // Keep up to latest 1000 events locally
    const trimmed = events.slice(-1000);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save events to localStorage', e);
  }
}

// Current In-Memory State
let currentSession: VisitorSession | null = null;
let heartbeatInterval: any = null;
let activeSecondsCounter = 0;
let isInitialized = false;

// Initialize Tracker
export function initAnalytics(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // 1. Visitor ID (persistent in localStorage)
  let vid = localStorage.getItem(STORAGE_KEY_VID);
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    try {
      localStorage.setItem(STORAGE_KEY_VID, vid);
    } catch {}
  }

  // 2. Session ID (sessionStorage)
  let sid = sessionStorage.getItem(STORAGE_KEY_SID);
  const now = Date.now();

  if (!sid) {
    sid = 's_' + Math.random().toString(36).substring(2, 10) + '_' + now.toString(36);
    try {
      sessionStorage.setItem(STORAGE_KEY_SID, sid);
    } catch {}
  }

  const { referrer, category: referrerCategory } = detectReferrer();

  currentSession = {
    sessionId: sid,
    visitorId: vid,
    startTime: now,
    lastActive: now,
    durationSeconds: 0,
    referrer,
    referrerCategory,
    device: detectDevice(),
    os: detectOS(),
    browser: detectBrowser(),
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language || 'uk',
  };

  // Record session in sessions store
  const sessions = getStoredSessions();
  const existingIndex = sessions.findIndex((s) => s.sessionId === sid);
  if (existingIndex >= 0) {
    currentSession = sessions[existingIndex];
  } else {
    sessions.push(currentSession);
    saveStoredSessions(sessions);
    // Send beacon to InfinityFree PHP backend if hosted
    pingServer('session_start', currentSession);
  }

  // 3. Heartbeat timer for active time
  heartbeatInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && currentSession) {
      activeSecondsCounter += 15;
      currentSession.durationSeconds = activeSecondsCounter;
      currentSession.lastActive = Date.now();
      updateCurrentSession();
    }
  }, 15000);

  // 4. Visibility & beforeunload handling
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && currentSession) {
      currentSession.lastActive = Date.now();
      updateCurrentSession();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (currentSession) {
      currentSession.lastActive = Date.now();
      updateCurrentSession();
      pingServer('session_end', {
        sessionId: currentSession.sessionId,
        durationSeconds: currentSession.durationSeconds,
      });
    }
  });
}

function updateCurrentSession(): void {
  if (!currentSession) return;
  const sessions = getStoredSessions();
  const idx = sessions.findIndex((s) => s.sessionId === currentSession!.sessionId);
  if (idx >= 0) {
    sessions[idx] = { ...currentSession };
    saveStoredSessions(sessions);
  }
}

// Log custom event
export function trackEvent(
  category: AnalyticsEvent['category'],
  action: string,
  label?: string,
  value?: number
): void {
  if (!currentSession) return;

  const event: AnalyticsEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    visitorId: currentSession.visitorId,
    sessionId: currentSession.sessionId,
    category,
    action,
    label,
    value,
  };

  const events = getStoredEvents();
  events.push(event);
  saveStoredEvents(events);

  // Send to server in background
  pingServer('event', event);
}

// Specific event helpers
export function trackToolUse(toolName: string): void {
  trackEvent('tool', toolName, `Інструмент: ${toolName}`);
}

export function trackDocumentLoad(pagesCount: number, fileName: string): void {
  trackEvent('document', 'document_loaded', fileName, pagesCount);
}

export function trackDocumentExport(pagesCount: number, fileName: string): void {
  trackEvent('document', 'document_exported', fileName, pagesCount);
}

export function trackDocumentPrint(): void {
  trackEvent('document', 'document_printed', 'Друк документа');
}

export function trackMergePdf(): void {
  trackEvent('document', 'document_merged', 'Об\'єднання PDF');
}

export function trackThemeChange(theme: 'light' | 'dark'): void {
  trackEvent('theme', 'theme_switched', theme);
}

// Asynchronously pings InfinityFree PHP backend
function pingServer(action: string, data: any): void {
  try {
    const url = `/api/analytics.php?action=${encodeURIComponent(action)}`;
    const payload = JSON.stringify(data);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, payload);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

// Asynchronously syncs with InfinityFree PHP server to fetch global real visitor stats
export async function syncServerAnalytics(): Promise<void> {
  try {
    const res = await fetch('/api/analytics.php?action=stats');
    if (!res.ok) return;
    const json = await res.json();
    if (json.status === 'ok' && json.data) {
      const serverStore = json.data;
      if (Array.isArray(serverStore.sessions)) {
        const localSessions = getStoredSessions();
        const localMap = new Map(localSessions.map((s) => [s.sessionId, s]));
        for (const s of serverStore.sessions) {
          if (!localMap.has(s.id)) {
            localMap.set(s.id, {
              sessionId: s.id,
              visitorId: s.vid || 'remote',
              startTime: (s.time || 0) * 1000,
              lastActive: (s.time || 0) * 1000 + (s.duration || 0) * 1000,
              durationSeconds: s.duration || 0,
              referrer: s.referrer || 'Прямий перехід',
              referrerCategory: 'Зовнішній',
              device: (s.device as any) || 'desktop',
              os: s.os || 'Інша',
              browser: s.browser || 'Інший',
              screen: 'N/A',
              language: 'uk',
            });
          }
        }
        saveStoredSessions(Array.from(localMap.values()));
      }

      if (Array.isArray(serverStore.events)) {
        const localEvents = getStoredEvents();
        const localEventSet = new Set(localEvents.map((e) => `${e.timestamp}_${e.action}`));
        let added = false;
        for (const ev of serverStore.events) {
          const evTime = (ev.time || 0) * 1000;
          const key = `${evTime}_${ev.act}`;
          if (!localEventSet.has(key)) {
            localEvents.push({
              id: 'evt_srv_' + Math.random().toString(36).substring(2, 7),
              timestamp: evTime,
              visitorId: 'srv',
              sessionId: 'srv',
              category: ev.cat || 'tool',
              action: ev.act || '',
              value: ev.val,
            });
            added = true;
          }
        }
        if (added) {
          saveStoredEvents(localEvents);
        }
      }
    }
  } catch {}
}

// Clear analytics
export function clearAnalytics(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
  } catch {}
}

// Aggregation Engine - STRICTLY REAL METRICS ONLY (NO DEMO / MOCK DATA)
export function getAnalyticsSummary(
  period: 'today' | '7d' | '30d' | 'all' = '7d'
): AnalyticsSummary {
  const sessions = getStoredSessions();
  const events = getStoredEvents();

  const now = Date.now();
  const msInDay = 86400000;
  let cutoff = 0;

  if (period === 'today') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    cutoff = startOfToday.getTime();
  } else if (period === '7d') {
    cutoff = now - 7 * msInDay;
  } else if (period === '30d') {
    cutoff = now - 30 * msInDay;
  }

  // Filter strictly real data by cutoff
  const filteredSessions = sessions.filter((s) => s.startTime >= cutoff);
  const filteredEvents = events.filter((e) => e.timestamp >= cutoff);

  const realVisits = filteredSessions.length;
  const realUniques = new Set(filteredSessions.map((s) => s.visitorId)).size;
  const realTotalTime = filteredSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const realAvgTime = realVisits > 0 ? Math.round(realTotalTime / realVisits) : 0;
  const realExports = filteredEvents.filter((e) => e.action === 'document_exported').length;

  const totalVisits = realVisits;
  const uniqueVisitors = realUniques;
  const avgDurationSeconds = realAvgTime;
  const totalExports = realExports;

  // Active visitors currently (within last 3 minutes)
  const activeVisitorsNow = filteredSessions.filter((s) => now - s.lastActive < 180000).length;

  // Referrers aggregation strictly from real sessions
  const refMap: Record<string, { count: number; category: string }> = {};

  filteredSessions.forEach((s) => {
    const key = s.referrer || 'Прямий перехід';
    if (!refMap[key]) {
      refMap[key] = { count: 0, category: s.referrerCategory || 'Інше' };
    }
    refMap[key].count += 1;
  });

  const totalRefCount = Object.values(refMap).reduce((a, b) => a + b.count, 0) || 1;
  const referrers = Object.entries(refMap)
    .map(([name, data]) => ({
      name,
      category: data.category,
      count: data.count,
      percentage: totalVisits > 0 ? Math.round((data.count / totalRefCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Daily visits chart (last 7 or 14 days)
  const daysCount = period === 'today' ? 1 : period === '7d' ? 7 : 14;
  const dailyVisits: Array<{ date: string; visits: number; uniques: number; avgDuration: number }> = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now - i * msInDay);
    const dateStr = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + msInDay;

    const dayRealSessions = filteredSessions.filter((s) => s.startTime >= dayStart && s.startTime < dayEnd);
    const dayRealVisits = dayRealSessions.length;
    const dayRealUniques = new Set(dayRealSessions.map((s) => s.visitorId)).size;
    const dayTotalTime = dayRealSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const dayAvgDuration = dayRealVisits > 0 ? Math.round(dayTotalTime / dayRealVisits) : 0;

    dailyVisits.push({
      date: dateStr,
      visits: dayRealVisits,
      uniques: dayRealUniques,
      avgDuration: dayAvgDuration,
    });
  }

  // Tools popularity ranking strictly from real events
  const toolsMap: Record<string, number> = {};
  filteredEvents
    .filter((e) => e.category === 'tool')
    .forEach((e) => {
      toolsMap[e.action] = (toolsMap[e.action] || 0) + 1;
    });

  const toolMeta: Record<string, { name: string; color: string }> = {
    text: { name: 'Редагування тексту', color: '#3B82F6' },
    stamp: { name: 'Штампи та печатки', color: '#EF4444' },
    signature: { name: 'Цифровий підпис', color: '#10B981' },
    shape: { name: 'Геометричні фігури', color: '#8B5CF6' },
    highlighter: { name: 'Текстовий маркер', color: '#F59E0B' },
    whiteout: { name: 'Коректор (замазка)', color: '#6B7280' },
    draw: { name: 'Малювання від руки', color: '#EC4899' },
    merge: { name: 'Об\'єднання PDF', color: '#06B6D4' },
    export: { name: 'Експорт готового PDF', color: '#2563EB' },
  };

  const totalToolActions = Object.values(toolsMap).reduce((a, b) => a + b, 0);
  const toolsRank = Object.entries(toolsMap)
    .map(([id, count]) => {
      const meta = toolMeta[id] || { name: id, color: '#64748B' };
      return {
        id,
        name: meta.name,
        count,
        percentage: totalToolActions > 0 ? Math.round((count / totalToolActions) * 100) : 0,
        color: meta.color,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Device breakdown strictly from real sessions
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  filteredSessions.forEach((s) => {
    if (s.device in deviceCounts) {
      deviceCounts[s.device]++;
    }
  });
  const devTotal = filteredSessions.length;
  const deviceBreakdown = [
    { type: 'Комп\'ютери (Desktop)', count: deviceCounts.desktop, percentage: devTotal > 0 ? Math.round((deviceCounts.desktop / devTotal) * 100) : 0 },
    { type: 'Смартфони (Mobile)', count: deviceCounts.mobile, percentage: devTotal > 0 ? Math.round((deviceCounts.mobile / devTotal) * 100) : 0 },
    { type: 'Планшети (Tablet)', count: deviceCounts.tablet, percentage: devTotal > 0 ? Math.round((deviceCounts.tablet / devTotal) * 100) : 0 },
  ];

  // OS breakdown strictly from real sessions
  const osMap: Record<string, number> = {};
  filteredSessions.forEach((s) => {
    osMap[s.os] = (osMap[s.os] || 0) + 1;
  });
  const osTotal = filteredSessions.length;
  const osBreakdown = Object.entries(osMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: osTotal > 0 ? Math.round((count / osTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Browser breakdown strictly from real sessions
  const browserMap: Record<string, number> = {};
  filteredSessions.forEach((s) => {
    browserMap[s.browser] = (browserMap[s.browser] || 0) + 1;
  });
  const browserTotal = filteredSessions.length;
  const browserBreakdown = Object.entries(browserMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: browserTotal > 0 ? Math.round((count / browserTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Duration distribution strictly from real sessions
  const countLt30 = filteredSessions.filter((s) => (s.durationSeconds || 0) < 30).length;
  const count30to180 = filteredSessions.filter((s) => (s.durationSeconds || 0) >= 30 && (s.durationSeconds || 0) < 180).length;
  const count180to600 = filteredSessions.filter((s) => (s.durationSeconds || 0) >= 180 && (s.durationSeconds || 0) < 600).length;
  const countGt600 = filteredSessions.filter((s) => (s.durationSeconds || 0) >= 600).length;

  const durationDistribution = [
    { label: '< 30 сек (швидкий перегляд)', count: countLt30, percentage: totalVisits > 0 ? Math.round((countLt30 / totalVisits) * 100) : 0 },
    { label: '1 - 3 хв (базове редагування)', count: count30to180, percentage: totalVisits > 0 ? Math.round((count30to180 / totalVisits) * 100) : 0 },
    { label: '3 - 10 хв (повний цикл роботи)', count: count180to600, percentage: totalVisits > 0 ? Math.round((count180to600 / totalVisits) * 100) : 0 },
    { label: '> 10 хв (глибока робота / об\'єднання)', count: countGt600, percentage: totalVisits > 0 ? Math.round((countGt600 / totalVisits) * 100) : 0 },
  ];

  // Actions counts strictly from real events
  const actionsSummary = {
    documentsLoaded: filteredEvents.filter((e) => e.action === 'document_loaded').length,
    documentsExported: totalExports,
    documentsPrinted: filteredEvents.filter((e) => e.action === 'document_printed').length,
    merges: filteredEvents.filter((e) => e.action === 'document_merged').length,
    textEdits: toolsMap['text'] || 0,
    stampsAdded: toolsMap['stamp'] || 0,
    signaturesAdded: toolsMap['signature'] || 0,
    shapesDrawn: toolsMap['shape'] || 0,
  };

  const bounceRate = totalVisits > 0
    ? Math.round((filteredSessions.filter((s) => (s.durationSeconds || 0) < 15).length / totalVisits) * 100)
    : 0;

  return {
    period,
    totalVisits,
    uniqueVisitors,
    avgDurationSeconds,
    totalExports,
    activeVisitorsNow,
    bounceRate,
    dailyVisits,
    referrers,
    toolsRank,
    deviceBreakdown,
    osBreakdown,
    browserBreakdown,
    durationDistribution,
    actionsSummary,
  };
}
