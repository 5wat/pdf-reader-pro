import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, PenTool, Type, Upload } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySignature: (dataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onApplySignature,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [inkColor, setInkColor] = useState<string>('#000000');
  const [typeName, setTypeName] = useState<string>('Олександр Коваленко');
  const [typedFont, setTypedFont] = useState<string>('Caveat');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      clearCanvas();
    }
  }, [isOpen, activeTab]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDrawing.current = true;
    lastPoint.current = getCanvasCoords(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCanvasCoords(e);

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setUploadedImage(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onApplySignature(dataUrl);
    } else if (activeTab === 'type') {
      // Render typed signature onto offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 150;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.font = `60px "${typedFont}", cursive`;
        ctx.fillStyle = inkColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typeName || 'Підпис', 200, 75);
        onApplySignature(offscreen.toDataURL('image/png'));
      }
    } else if (activeTab === 'upload' && uploadedImage) {
      onApplySignature(uploadedImage);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Створення електронного підпису
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-5 pt-2">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'draw'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Намалювати</span>
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'type'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Ввести ім'я</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Завантажити скан</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 flex flex-col items-center">
          {/* Ink color picker */}
          <div className="w-full flex items-center justify-between mb-3 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Колір чорнила:</span>
            <div className="flex items-center space-x-2">
              {[
                { label: 'Чорний', value: '#000000' },
                { label: 'Синій', value: '#1D4ED8' },
                { label: 'Темно-синій', value: '#1E3A8A' },
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => setInkColor(c.value)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md border text-[11px] ${
                    inkColor === c.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.value }} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: DRAW */}
          {activeTab === 'draw' && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full h-44 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl relative overflow-hidden flex items-center justify-center cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={170}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="touch-none w-full h-full"
                />
                <div className="absolute bottom-2 left-4 pointer-events-none text-[11px] text-slate-400">
                  Розпишіться мишею або тачпадом вище лінії
                </div>
                <div className="absolute bottom-6 left-4 right-4 h-[1px] bg-slate-300 dark:bg-slate-700 pointer-events-none" />
              </div>
              <button
                onClick={clearCanvas}
                className="mt-2.5 text-xs text-slate-500 hover:text-red-600 flex items-center space-x-1 transition-colors self-end"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистити поле</span>
              </button>
            </div>
          )}

          {/* TAB 2: TYPE */}
          {activeTab === 'type' && (
            <div className="w-full space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ваше ім'я або ініціали:
                </label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="Введіть ПІБ..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Font choices */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Стиль каліграфії:
                </label>
                {['Caveat', 'Playfair Display', 'cursive'].map((f) => (
                  <div
                    key={f}
                    onClick={() => setTypedFont(f)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${
                      typedFont === f
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="text-2xl"
                      style={{ fontFamily: f, color: inkColor }}
                    >
                      {typeName || 'Підпис'}
                    </span>
                    {typedFont === f && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="w-full flex flex-col items-center">
              <label className="w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors p-4">
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Скан підпису"
                    className="max-h-32 object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-500 text-center">
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Натисніть для вибору файлу зображення
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Підтримуються PNG з прозорим фоном або JPG
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleUploadFile}
                  className="hidden"
                />
              </label>
            </div>
          )}
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
            onClick={handleApply}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Застосувати підпис</span>
          </button>
        </div>
      </div>
    </div>
  );
};
