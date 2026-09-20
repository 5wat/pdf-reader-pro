import React, { useState } from 'react';
import { X, Layers, Upload, Check } from 'lucide-react';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (pdfBytes: Uint8Array) => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  onMerge,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setFileBytes(new Uint8Array(ev.target.result as ArrayBuffer));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmMerge = () => {
    if (!fileBytes) return;
    setIsProcessing(true);
    try {
      onMerge(fileBytes);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Об'єднання PDF файлів
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center">
          <label className="w-full h-44 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors p-4 text-center">
            {selectedFile ? (
              <div className="flex flex-col items-center text-slate-700 dark:text-slate-200">
                <Check className="w-10 h-10 text-emerald-500 mb-2" />
                <span className="text-sm font-bold truncate max-w-[260px]">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ • готовий до приєднання
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <Upload className="w-10 h-10 text-blue-500 mb-2" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Оберіть PDF файл для додавання
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Сторінки обраного файлу будуть додані в кінець поточного документа
                </span>
              </div>
            )}
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={handleConfirmMerge}
            disabled={!fileBytes || isProcessing}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-all shadow-sm flex items-center space-x-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Об\'єднання...' : 'Об\'єднати документи'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
