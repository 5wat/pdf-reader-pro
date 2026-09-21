import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmd = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { key: `${cmd} + Z`, desc: 'Скасувати останню дію (Undo)' },
    { key: `${cmd} + ⇧ + Z / ${cmd} + Y`, desc: 'Повторити дію (Redo)' },
    { key: `${cmd} + S`, desc: 'Зберегти / Експортувати PDF на комп\'ютер' },
    { key: `${cmd} + P`, desc: 'Друк документа' },
    { key: `${cmd} + V`, desc: 'Вставити зображення з буфера обміну (Скриншот)' },
    { key: `${cmd} + +`, desc: 'Збільшити масштаб документа' },
    { key: `${cmd} + -`, desc: 'Зменшити масштаб документа' },
    { key: `${cmd} + 0`, desc: 'Скинути масштаб на 100%' },
    { key: 'V', desc: 'Інструмент: Вибір та переміщення' },
    { key: 'E', desc: 'Інструмент: Редагування наявного тексту' },
    { key: 'T', desc: 'Інструмент: Додати новий текстовий блок' },
    { key: 'I', desc: 'Інструмент: Додати зображення з файлу' },
    { key: 'P', desc: 'Інструмент: Олівець (вільне малювання)' },
    { key: 'H', desc: 'Інструмент: Маркер (хайлайтер)' },
    { key: 'W', desc: 'Інструмент: Коректор / Біле замазування' },
    { key: 'Delete / ⌫', desc: 'Видалити обраний блок тексту чи зображення' },
    { key: 'Esc', desc: 'Скинути виділення / вийти з поточного режиму' },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col transition-all cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Command className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Гарячі клавіші (Шорткати)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 max-h-[420px] overflow-y-auto space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 last:border-0 text-xs"
            >
              <span className="text-slate-600 dark:text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md font-mono font-semibold text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
          >
            Зрозуміло
          </button>
        </div>
      </div>
    </div>
  );
};
