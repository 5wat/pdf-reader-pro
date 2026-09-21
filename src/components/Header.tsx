import React from 'react';
import {
  FileUp,
  Download,
  Printer,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FilePlus,
  Layers,
  HelpCircle,
  Sun,
  Moon,
  FileText,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  fileName: string;
  onFileNameChange: (name: string) => void;
  onOpenFile: () => void;
  onNewFile: () => void;
  onMergeFile: () => void;
  onSavePdf: () => void;
  onPrint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onOpenShortcuts: () => void;
  onToggleOnboarding?: () => void;
  isOnboardingActive?: boolean;
  isSaving: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  onFileNameChange,
  onOpenFile,
  onNewFile,
  onMergeFile,
  onSavePdf,
  onPrint,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  theme,
  onThemeChange,
  onOpenShortcuts,
  onToggleOnboarding,
  isOnboardingActive,
  isSaving,
}) => {
  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-30 select-none shadow-sm transition-colors">
      {/* Left: Brand & File Name */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-white/20">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-base">
              ProPDF
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 lowercase tracking-wider bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
              free
            </span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Editable document name */}
        <input
          type="text"
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 px-2 py-1 rounded border border-transparent focus:border-blue-500 outline-none max-w-[200px] truncate transition-colors"
          title="Натисніть для зміни назви файлу"
        />
      </div>

      {/* Center: File actions, Undo/Redo & Zoom controls */}
      <div className="flex items-center space-x-2">
        {/* Open / New / Merge */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={onOpenFile}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm"
            title="Відкрити PDF з комп'ютера (Cmd+O)"
          >
            <FileUp className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Відкрити</span>
          </button>
          <button
            onClick={onNewFile}
            className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
            title="Створити чистий документ A4"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onMergeFile}
            className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
            title="Об'єднати з іншим PDF документом"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-all ${
              canUndo
                ? 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm'
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
            title="Скасувати останню дію (Cmd+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-all ${
              canRedo
                ? 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm'
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
            title="Повторити дію (Cmd+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={onZoomOut}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
            title="Зменшити масштаб (Cmd -)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-[11px]"
            title="Скинути на 100% (Cmd 0)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
            title="Збільшити масштаб (Cmd +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitWidth}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all hidden md:flex"
            title="Підігнати по ширині"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Theme, Help, Print, Save/Export */}
      <div className="flex items-center space-x-2">
        {/* Theme switcher: Dark <-> Light */}
        <button
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title={theme === 'dark' ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {/* Onboarding toggle */}
        {onToggleOnboarding && (
          <button
            id="onboarding-toggle-btn"
            onClick={onToggleOnboarding}
            className={`p-1.5 rounded-lg transition-colors border ${
              isOnboardingActive
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
            }`}
            title={isOnboardingActive ? 'Закрити інструкцію (Онбординг)' : 'Відкрити тур по можливостях (Онбординг)'}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
          </button>
        )}

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Гарячі клавіші"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Print */}
        <button
          onClick={onPrint}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex"
          title="Друк документа (Cmd+P)"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Save / Export Button */}
        <button
          onClick={onSavePdf}
          disabled={isSaving}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          title="Зберегти та завантажити готовий PDF (Cmd+S)"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{isSaving ? 'Експорт...' : 'Зберегти PDF'}</span>
        </button>
      </div>
    </header>
  );
};
