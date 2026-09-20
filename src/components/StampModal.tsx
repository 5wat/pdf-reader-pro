import React, { useState } from 'react';
import { X, Stamp, Plus } from 'lucide-react';

interface StampModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStamp: (stamp: {
    text: string;
    subtitle?: string;
    date?: string;
    color: string;
  }) => void;
}

const PRESET_STAMPS = [
  { id: 'approved_ua', text: 'ЗАТВЕРДЖЕНО', color: '#16A34A', subtitle: 'ОФІЦІЙНИЙ ДОКУМЕНТ' },
  { id: 'copy_ua', text: 'КОПІЯ ВІРНА', color: '#2563EB', subtitle: 'ЗГІДНО З ОРИГІНАЛОМ' },
  { id: 'paid_ua', text: 'ОПЛАЧЕНО', color: '#059669', subtitle: 'БЕЗГОТІВКОВИЙ РОЗРАХУНОК' },
  { id: 'confidential_ua', text: 'КОНФІДЕНЦІЙНО', color: '#DC2626', subtitle: 'ОБМЕЖЕНИЙ ДОСТУП' },
  { id: 'verified_ua', text: 'ПЕРЕВІРЕНО', color: '#4F46E5', subtitle: 'ВІДДІЛ КОНТРОЛЮ ЯКОСТІ' },
  { id: 'approved_en', text: 'APPROVED', color: '#16A34A', subtitle: 'MANAGEMENT SIGN-OFF' },
  { id: 'draft_en', text: 'DRAFT', color: '#64748B', subtitle: 'NOT FINAL VERSION' },
];

export const StampModal: React.FC<StampModalProps> = ({
  isOpen,
  onClose,
  onApplyStamp,
}) => {
  const [includeDate, setIncludeDate] = useState<boolean>(true);
  const [customText, setCustomText] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('#DC2626');

  const todayStr = new Date().toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Stamp className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Оберіть або створіть штамп
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="px-5 pt-3 flex items-center justify-between text-xs">
          <label className="flex items-center space-x-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
            <input
              type="checkbox"
              checked={includeDate}
              onChange={(e) => setIncludeDate(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4"
            />
            <span>Додати поточну дату до штампа ({todayStr})</span>
          </label>
        </div>

        {/* Presets Grid */}
        <div className="p-5 grid grid-cols-2 gap-3 max-h-[340px] overflow-y-auto">
          {PRESET_STAMPS.map((stamp) => (
            <button
              key={stamp.id}
              onClick={() => {
                onApplyStamp({
                  text: stamp.text,
                  subtitle: stamp.subtitle,
                  date: includeDate ? todayStr : undefined,
                  color: stamp.color,
                });
                onClose();
              }}
              className="group p-3 rounded-xl border-2 hover:shadow-md transition-all flex flex-col items-center justify-center text-center relative overflow-hidden"
              style={{ borderColor: stamp.color }}
            >
              <div
                className="w-full py-1.5 px-2 border-2 border-dashed rounded flex flex-col items-center justify-center transition-transform group-hover:scale-105"
                style={{ borderColor: stamp.color, color: stamp.color }}
              >
                <span className="font-extrabold text-sm tracking-wider uppercase">
                  {stamp.text}
                </span>
                {stamp.subtitle && (
                  <span className="text-[9px] font-semibold tracking-tight opacity-90">
                    {stamp.subtitle}
                  </span>
                )}
                {includeDate && (
                  <span className="text-[8px] font-mono mt-0.5 opacity-80">
                    {todayStr}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Custom Stamp Section */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
            Або створіть власний штамп:
          </span>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Текст штампа (наприклад: ДО ВІДОМА)"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
            />
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-slate-300 dark:border-slate-700"
              title="Колір штампа"
            />
            <button
              onClick={() => {
                if (!customText.trim()) return;
                onApplyStamp({
                  text: customText.toUpperCase(),
                  subtitle: customSubtitle || undefined,
                  date: includeDate ? todayStr : undefined,
                  color: customColor,
                });
                onClose();
              }}
              disabled={!customText.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
