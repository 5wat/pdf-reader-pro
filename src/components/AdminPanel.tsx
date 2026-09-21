import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  LogOut,
  Shield,
  Users,
  Clock,
  Download,
  Share2,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertCircle,
  Globe,
  Sparkles,
} from 'lucide-react';
import {
  AdminUser,
  getAdminSettings,
  saveAdminSettings,
  getCurrentAdmin,
  loginWithGoogleCredential,
  logoutAdmin,
  isAuthenticated,
  DEFAULT_GOOGLE_CLIENT_ID,
} from '../services/adminAuth';
import {
  getAnalyticsSummary,
  clearAnalytics,
  AnalyticsSummary,
} from '../services/analyticsTracker';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  // Auth state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getCurrentAdmin());
  const [authError, setAuthError] = useState<string | null>(null);

  // Settings state
  const [googleClientIdInput, setGoogleClientIdInput] = useState<string>('');
  const [allowedEmailsInput, setAllowedEmailsInput] = useState<string>('');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Dashboard controls
  const [activeTab, setActiveTab] = useState<'overview' | 'referrers' | 'tools' | 'devices' | 'settings'>('overview');
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [includeDemo, setIncludeDemo] = useState<boolean>(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Google GSI Container Ref
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load admin user and initial settings
  useEffect(() => {
    if (isOpen) {
      const user = getCurrentAdmin();
      setAdminUser(user);
      const settings = getAdminSettings();
      setGoogleClientIdInput(settings.googleClientId || '');
      setAllowedEmailsInput(settings.allowedEmails.join(', '));
    }
  }, [isOpen]);

  // Load analytics summary
  useEffect(() => {
    if (isOpen && adminUser) {
      const data = getAnalyticsSummary(period, includeDemo);
      setSummary(data);
    }
  }, [isOpen, adminUser, period, includeDemo, refreshKey]);

  // Initialize Google Sign-In button if GSI is available
  useEffect(() => {
    if (!isOpen || adminUser) return;

    const settings = getAdminSettings();
    const clientId = settings.googleClientId || DEFAULT_GOOGLE_CLIENT_ID;

    const initGoogle = () => {
      const google = (window as any).google;
      if (google?.accounts?.id && googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response && response.credential) {
              const res = loginWithGoogleCredential(response.credential);
              if (res.success && res.user) {
                setAdminUser(res.user);
                setAuthError(null);
              } else {
                setAuthError(res.error || 'Помилка авторизації Google');
              }
            }
          },
        });

        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280,
          locale: 'uk',
        });
      }
    };

    const timer = setTimeout(initGoogle, 200);
    return () => clearTimeout(timer);
  }, [isOpen, adminUser]);

  // Handle Logout
  const handleLogout = () => {
    logoutAdmin();
    setAdminUser(null);
    setAuthError(null);
  };

  // Handle Settings Save
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEmails = allowedEmailsInput
      .split(',')
      .map((em) => em.trim().toLowerCase())
      .filter((em) => em.length > 0);

    saveAdminSettings({
      googleClientId: googleClientIdInput.trim(),
      allowedEmails: parsedEmails,
    });

    setSettingsSuccessMsg('Налаштування успішно збережено!');
    setTimeout(() => setSettingsSuccessMsg(null), 3000);
  };

  // Export Analytics Data
  const handleExportData = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propdf_analytics_${period}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Analytics
  const handleClearAnalytics = () => {
    if (window.confirm('Ви впевнені, що хочете очистити всю збережену локальну статистику?')) {
      clearAnalytics();
      setRefreshKey((k) => k + 1);
    }
  };

  if (!isOpen) return null;

  // Format seconds to human time (e.g. 4 хв 25 с)
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} сек`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m} хв ${s} с` : `${m} хв`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Container - Adaptive for mobile, tablet, desktop */}
      <div className="w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all text-slate-900 dark:text-slate-100">
        
        {/* ======================================================== */}
        {/* VIEW 1: AUTHENTICATION SCREEN (GOOGLE SIGN-IN ONLY)       */}
        {/* ======================================================== */}
        {!adminUser ? (
          <div className="flex flex-col items-center justify-center p-6 sm:p-10 my-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-4">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-900 dark:text-white mb-1">
              Панель керування ProPDF
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-6">
              Вхід доступний виключно для авторизованого Google акаунта власника сайту.
            </p>

            {authError && (
              <div className="w-full max-w-md mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="w-full max-w-md space-y-4">
              {/* Google Sign-In Container */}
              <div className="flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4">
                  Авторизація через Google акаунт
                </span>
                <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center w-full" />
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center">
                  Доступ надається тільки поштовим скринькам із білого списку адміністраторів
                </span>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all min-h-[44px]"
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* VIEW 2: AUTHENTICATED ADMIN DASHBOARD                     */
          /* ======================================================== */
          <>
            {/* Top Navigation Bar */}
            <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Left: Brand & Admin User Info + Mobile Action Buttons */}
              <div className="flex items-center justify-between space-x-3 w-full sm:w-auto">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 flex-shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm sm:text-base tracking-tight truncate">ProPDF Admin</span>
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Online</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <span className="truncate">{adminUser.name}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="truncate">{adminUser.email}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Top-Right Actions */}
                <div className="flex sm:hidden items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={handleLogout}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                    title="Вийти з адмін-панелі"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg"
                    title="Закрити адмінку"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
                {/* Period Selector */}
                <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs flex-1 sm:flex-initial justify-between sm:justify-start">
                  <button
                    onClick={() => setPeriod('today')}
                    className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md font-medium text-center transition-all ${
                      period === 'today'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Сьогодні
                  </button>
                  <button
                    onClick={() => setPeriod('7d')}
                    className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md font-medium text-center transition-all ${
                      period === '7d'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    7 днів
                  </button>
                  <button
                    onClick={() => setPeriod('30d')}
                    className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md font-medium text-center transition-all ${
                      period === '30d'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    30 днів
                  </button>
                  <button
                    onClick={() => setPeriod('all')}
                    className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md font-medium text-center transition-all ${
                      period === 'all'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Все
                  </button>
                </div>

                {/* Data Demo Mode Toggle */}
                <button
                  onClick={() => setIncludeDemo(!includeDemo)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all flex items-center space-x-1 flex-shrink-0 ${
                    includeDemo
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Увімкнути/вимкнути демонстраційні зразки даних поряд із реальними відвідувачами"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">{includeDemo ? 'Демо + Реальні' : 'Тільки локальні'}</span>
                  <span className="sm:hidden">{includeDemo ? 'Демо' : 'Локал'}</span>
                </button>

                {/* Export Report (Desktop) */}
                <button
                  onClick={handleExportData}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 hidden sm:flex"
                  title="Експорт звіту аналітики (JSON)"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Logout Button (Desktop) */}
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-900 transition-colors items-center space-x-1"
                  title="Вийти з адмін-панелі"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Вийти</span>
                </button>

                {/* Close Button (Desktop) */}
                <button
                  onClick={onClose}
                  className="hidden sm:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  title="Закрити адмінку"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs - Horizontally scrollable on mobile */}
            <div className="px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar flex items-center space-x-1 sm:space-x-3 bg-white dark:bg-slate-900 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-2 sm:px-3 border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Загальний огляд</span>
              </button>
              <button
                onClick={() => setActiveTab('referrers')}
                className={`py-3 px-2 sm:px-3 border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'referrers'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Джерела трафіку</span>
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={`py-3 px-2 sm:px-3 border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'tools'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Інструменти та дії</span>
              </button>
              <button
                onClick={() => setActiveTab('devices')}
                className={`py-3 px-2 sm:px-3 border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'devices'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Пристрої та браузери</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-2 sm:px-3 border-b-2 transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'settings'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Безпека та налаштування</span>
              </button>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {summary && (
                <>
                  {/* ======================================================== */}
                  {/* TAB 1: OVERVIEW & KPIS                                   */}
                  {/* ======================================================== */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* 4 KPI Cards: Grid 2 cols on mobile, 4 cols on desktop */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Card 1: Total Visits */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Всього відвідувань
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <Users className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                              {summary.totalVisits.toLocaleString()}
                            </div>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-1">
                              ↑ +14% від минулого періоду
                            </span>
                          </div>
                        </div>

                        {/* Card 2: Unique Visitors */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Унікальні гості
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Shield className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                              {summary.uniqueVisitors.toLocaleString()}
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                              {Math.round((summary.uniqueVisitors / (summary.totalVisits || 1)) * 100)}% унікальних
                            </span>
                          </div>
                        </div>

                        {/* Card 3: Avg Time on Site */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Середній час сесії
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                              <Clock className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                              {formatDuration(summary.avgDurationSeconds)}
                            </div>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                              Високе утримання
                            </span>
                          </div>
                        </div>

                        {/* Card 4: Total Exports */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Експортовано PDF
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                              <Download className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                              {summary.totalExports.toLocaleString()}
                            </div>
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">
                              {Math.round((summary.totalExports / (summary.totalVisits || 1)) * 100)}% конверсія в експорт
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Daily Activity Chart */}
                      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                              Динаміка відвідувань за днями
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Кількість сесій та унікальних користувачів
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
                              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                              <span>Візити</span>
                            </span>
                            <span className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
                              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                              <span>Унікальні</span>
                            </span>
                          </div>
                        </div>

                        {/* Interactive SVG Bar Graph */}
                        <div className="h-44 sm:h-52 w-full flex items-end space-x-2 sm:space-x-4 pt-6 pb-2">
                          {summary.dailyVisits.map((item, idx) => {
                            const maxVal = Math.max(...summary.dailyVisits.map((v) => v.visits), 10);
                            const heightPctVisits = Math.max(8, Math.round((item.visits / maxVal) * 100));
                            const heightPctUniques = Math.max(5, Math.round((item.uniques / maxVal) * 100));

                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                {/* Hover Tooltip */}
                                <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap">
                                  <span>{item.date}: {item.visits} візитів</span>
                                  <span className="text-indigo-300">{item.uniques} унікальних</span>
                                </div>

                                <div className="w-full flex items-end justify-center space-x-1 sm:space-x-1.5 h-full">
                                  <div
                                    style={{ height: `${heightPctVisits}%` }}
                                    className="w-full max-w-[18px] bg-blue-600 group-hover:bg-blue-500 rounded-t transition-all"
                                  />
                                  <div
                                    style={{ height: `${heightPctUniques}%` }}
                                    className="w-full max-w-[18px] bg-indigo-400/80 group-hover:bg-indigo-300 rounded-t transition-all"
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 truncate max-w-full">
                                  {item.date}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Split Row: Duration Distribution & Key Tools */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Time on site distribution */}
                        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                            Час проведений на сайті
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Розподіл сесій за тривалістю роботи
                          </p>

                          <div className="space-y-3">
                            {summary.durationDistribution.map((dur, i) => (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-700 dark:text-slate-300 font-medium">{dur.label}</span>
                                  <span className="text-slate-500 dark:text-slate-400">{dur.percentage}% ({dur.count})</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                    style={{ width: `${dur.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Summary of Actions */}
                        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                            Ключові дії з документами
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Події користувачів у редакторі
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Завантажено PDF</span>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">{summary.actionsSummary.documentsLoaded}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Об'єднано (Merge)</span>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">{summary.actionsSummary.merges}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Накладено штампів</span>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">{summary.actionsSummary.stampsAdded}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Створено підписів</span>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">{summary.actionsSummary.signaturesAdded}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* TAB 2: TRAFFIC SOURCES & REFERRERS                       */}
                  {/* ======================================================== */}
                  {activeTab === 'referrers' && (
                    <div className="space-y-6">
                      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-1">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                              Джерела переходів відвідувачів (Referrers)
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Звідки люди потрапляють на сайт {window.location.hostname}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            Всього переходів: {summary.totalVisits}
                          </span>
                        </div>

                        {/* List of referrers with progress bars */}
                        <div className="space-y-4">
                          {summary.referrers.map((ref, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Globe className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-bold text-slate-800 dark:text-white">{ref.name}</span>
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                    {ref.category}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {ref.count.toLocaleString()} візитів
                                  </span>
                                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[36px] text-right">
                                    {ref.percentage}%
                                  </span>
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${Math.max(2, ref.percentage)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* TAB 3: TOOLS & ACTIONS USAGE RANKING                    */}
                  {/* ======================================================== */}
                  {activeTab === 'tools' && (
                    <div className="space-y-6">
                      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-1">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                              Рейтинг популярності інструментів
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Якими функціями користувачі користуються найчастіше
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          {summary.toolsRank.map((tool, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold flex items-center justify-center text-slate-500">
                                    {idx + 1}
                                  </span>
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tool.color }}
                                  />
                                  <span className="font-bold text-slate-800 dark:text-white">
                                    {tool.name}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {tool.count.toLocaleString()} разів
                                  </span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400 min-w-[36px] text-right">
                                    {tool.percentage}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.max(2, tool.percentage)}%`,
                                    backgroundColor: tool.color,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* TAB 4: DEVICES, OS, BROWSERS                             */}
                  {/* ======================================================== */}
                  {activeTab === 'devices' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Device Type */}
                      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2 mb-3">
                          <Smartphone className="w-4 h-4 text-blue-500" />
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Типи пристроїв</h3>
                        </div>
                        <div className="space-y-3">
                          {summary.deviceBreakdown.map((dev, i) => (
                            <div key={i} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                              <div className="flex justify-between font-semibold mb-1">
                                <span>{dev.type}</span>
                                <span className="text-blue-600 dark:text-blue-400">{dev.percentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${dev.percentage}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Operating Systems */}
                      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2 mb-3">
                          <Monitor className="w-4 h-4 text-indigo-500" />
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Операційні системи</h3>
                        </div>
                        <div className="space-y-3">
                          {summary.osBreakdown.map((os, i) => (
                            <div key={i} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                              <div className="flex justify-between font-semibold mb-1">
                                <span>{os.name}</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{os.percentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${os.percentage}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Browsers */}
                      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2 mb-3">
                          <Globe className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Браузери</h3>
                        </div>
                        <div className="space-y-3">
                          {summary.browserBreakdown.map((br, i) => (
                            <div key={i} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                              <div className="flex justify-between font-semibold mb-1">
                                <span>{br.name}</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{br.percentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${br.percentage}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* TAB 5: SETTINGS & SECURITY                               */}
                  {/* ======================================================== */}
                  {activeTab === 'settings' && (
                    <div className="space-y-6">
                      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                          Налаштування безпеки та доступу
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                          Керування Google OAuth Client ID, білим списком поштових скриньок та майстер-паролем
                        </p>

                        {settingsSuccessMsg && (
                          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>{settingsSuccessMsg}</span>
                          </div>
                        )}

                        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                          {/* Google Client ID */}
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              Google Cloud Client ID:
                            </label>
                            <input
                              type="text"
                              value={googleClientIdInput}
                              onChange={(e) => setGoogleClientIdInput(e.target.value)}
                              placeholder="наприклад: 123456789-abc.apps.googleusercontent.com"
                              className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            />
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Створюється у Google Cloud Console (OAuth 2.0 Client IDs). Якщо залишити пустим, активний тестовий режим.
                            </span>
                          </div>

                          {/* Allowed Emails Whitelist */}
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              Білий список Google Email адміністраторів (через кому):
                            </label>
                            <input
                              type="text"
                              value={allowedEmailsInput}
                              onChange={(e) => setAllowedEmailsInput(e.target.value)}
                              placeholder="admin@gmail.com, owner@gmail.com"
                              className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            />
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Лише користувачі з цими адресами зможуть зайти через Google Sign-In. Якщо список порожній — доступ відкритий для будь-якого вашого Google акаунта.
                            </span>
                          </div>

                          {/* Security Info */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300">
                            <strong>Безпека:</strong> Вхід до панелі здійснюється виключно через Google Sign-In без паролів. Доступ дозволено лише для вказаних вище поштових адрес.
                          </div>

                          <div className="pt-2 flex flex-wrap gap-2">
                            <button
                              type="submit"
                              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer min-h-[44px]"
                            >
                              Зберегти зміни
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAnalytics}
                              className="py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl font-semibold border border-red-200 dark:border-red-900 transition-colors min-h-[44px]"
                            >
                              Очистити локальну статистику
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
