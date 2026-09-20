import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Plus,
  Minus,
  Square,
  Circle,
  MoveRight,
  Minus as LineIcon,
  Pipette,
  BringToFront,
  SendToBack,
} from 'lucide-react';
import {
  ToolMode,
  TextBlock,
  ImageElement,
  ShapeElement,
  ShapeType,
  StampElement,
  SignatureElement,
  WhiteoutElement,
} from '../types/pdf';

interface PropertiesBarProps {
  activeTool: ToolMode;
  selectedText: TextBlock | null;
  onUpdateText: (updated: Partial<TextBlock>) => void;
  onDeleteText: (id: string) => void;

  selectedImage: ImageElement | null;
  onUpdateImage: (updated: Partial<ImageElement>) => void;
  onDeleteImage: (id: string) => void;

  selectedShape: ShapeElement | null;
  onUpdateShape: (updated: Partial<ShapeElement>) => void;
  onDeleteShape: (id: string) => void;

  selectedStamp?: StampElement | null;
  onUpdateStamp?: (updated: Partial<StampElement>) => void;
  onDeleteStamp?: (id: string) => void;

  selectedSignature?: SignatureElement | null;
  onUpdateSignature?: (updated: Partial<SignatureElement>) => void;
  onDeleteSignature?: (id: string) => void;

  selectedWhiteout?: WhiteoutElement | null;
  onUpdateWhiteout?: (updated: Partial<WhiteoutElement>) => void;
  onDeleteWhiteout?: (id: string) => void;

  penColor: string;
  onPenColorChange: (color: string) => void;
  penWidth: number;
  onPenWidthChange: (w: number) => void;

  highlighterColor: string;
  onHighlighterColorChange: (color: string) => void;
  highlighterWidth: number;
  onHighlighterWidthChange: (w: number) => void;

  activeShapeType: ShapeType;
  onShapeTypeChange: (type: ShapeType) => void;
}

const COLOR_PRESETS = [
  '#000000',
  '#2563EB', // Blue
  '#DC2626', // Red
  '#16A34A', // Green
  '#D97706', // Amber
  '#9333EA', // Purple
  '#FFFFFF', // White
];

const HIGHLIGHTER_PRESETS = [
  '#FEF08A', // Yellow
  '#BAE6FD', // Light Blue
  '#BBF7D0', // Light Green
  '#FBCFE8', // Light Pink
  '#FED7AA', // Light Orange
];

export const PropertiesBar: React.FC<PropertiesBarProps> = ({
  activeTool,
  selectedText,
  onUpdateText,
  onDeleteText,
  selectedImage,
  onUpdateImage,
  onDeleteImage,
  selectedShape,
  onUpdateShape,
  onDeleteShape,
  selectedStamp,
  onUpdateStamp,
  onDeleteStamp,
  selectedSignature,
  onUpdateSignature,
  onDeleteSignature,
  selectedWhiteout,
  onUpdateWhiteout,
  onDeleteWhiteout,
  penColor,
  onPenColorChange,
  penWidth,
  onPenWidthChange,
  highlighterColor,
  onHighlighterColorChange,
  highlighterWidth,
  onHighlighterWidthChange,
  activeShapeType,
  onShapeTypeChange,
}) => {
  // 1. Text Properties (when text block is selected)
  if (selectedText) {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-2 text-xs overflow-x-auto z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Текст:
        </span>

        {/* Font Family */}
        <select
          value={selectedText.fontFamily}
          onChange={(e) => onUpdateText({ fontFamily: e.target.value })}
          className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 outline-none font-medium"
        >
          <option value="sans-serif">Sans-Serif (Стандартний)</option>
          <option value="Roboto">Roboto (Google)</option>
          <option value="Inter">Inter</option>
          <option value="serif">Serif (Times)</option>
          <option value="monospace">Monospace (Код)</option>
        </select>

        {/* Font Size */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            onClick={() => onUpdateText({ fontSize: Math.max(6, selectedText.fontSize - 1) })}
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Зменшити шрифт"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            value={selectedText.fontSize}
            onChange={(e) => onUpdateText({ fontSize: parseInt(e.target.value) || 12 })}
            className="w-9 text-center bg-transparent font-semibold text-slate-800 dark:text-slate-200 outline-none text-xs"
            min={6}
            max={96}
          />
          <button
            onClick={() => onUpdateText({ fontSize: Math.min(96, selectedText.fontSize + 1) })}
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Збільшити шрифт"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Styles: Bold, Italic, Underline, Strikethrough */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            onClick={() => onUpdateText({ isBold: !selectedText.isBold })}
            className={`p-1 rounded font-bold ${
              selectedText.isBold
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="Жирний (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateText({ isItalic: !selectedText.isItalic })}
            className={`p-1 rounded italic ${
              selectedText.isItalic
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="Курсив (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateText({ isUnderline: !selectedText.isUnderline })}
            className={`p-1 rounded ${
              selectedText.isUnderline
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="Підкреслений"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateText({ isStrikethrough: !selectedText.isStrikethrough })}
            className={`p-1 rounded ${
              selectedText.isStrikethrough
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="Закреслений"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            onClick={() => onUpdateText({ align: 'left' })}
            className={`p-1 rounded ${
              (selectedText.align || 'left') === 'left'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="По лівому краю"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateText({ align: 'center' })}
            className={`p-1 rounded ${
              selectedText.align === 'center'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="По центру"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateText({ align: 'right' })}
            className={`p-1 rounded ${
              selectedText.align === 'right'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="По правому краю"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Color */}
        <div className="flex items-center space-x-1 pl-1 border-l border-slate-200 dark:border-slate-700 ml-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Текст:</span>
          <div className="flex items-center space-x-1">
            {['#000000', '#FFFFFF', '#2563EB', '#DC2626', '#16A34A'].map((c) => (
              <button
                key={c}
                onClick={() => onUpdateText({ color: c })}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  selectedText.color === c ? 'scale-125 ring-2 ring-blue-500' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c, borderColor: '#94A3B8' }}
                title={`Колір тексту ${c}`}
              />
            ))}
            <input
              type="color"
              value={selectedText.color || '#000000'}
              onChange={(e) => onUpdateText({ color: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border border-slate-300 dark:border-slate-600"
              title="Довільний колір тексту"
            />
          </div>
        </div>

        {/* Background / Masking Color */}
        <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Тло:</span>

          {/* Quick preset swatches */}
          <div className="flex items-center space-x-1">
            {['#FFFFFF', '#143873', '#F1F5F9'].map((c) => (
              <button
                key={c}
                onClick={() => onUpdateText({ backgroundColor: c })}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  selectedText.backgroundColor === c
                    ? 'scale-125 ring-2 ring-blue-500 ring-offset-1 z-10'
                    : 'opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: c, borderColor: '#94A3B8' }}
                title={c === '#143873' ? 'Темно-синє тло шапки (#143873)' : c === '#FFFFFF' ? 'Біле тло (#FFFFFF)' : 'Світло-сіре (#F1F5F9)'}
              />
            ))}

            {selectedText.backgroundColor &&
              !['#FFFFFF', '#143873', '#F1F5F9', 'transparent'].includes(selectedText.backgroundColor) && (
                <button
                  onClick={() => onUpdateText({ backgroundColor: selectedText.backgroundColor })}
                  className="w-4 h-4 rounded-full border border-blue-400 ring-2 ring-blue-500 scale-125"
                  style={{ backgroundColor: selectedText.backgroundColor }}
                  title={`Тло з документа: ${selectedText.backgroundColor}`}
                />
              )}

            {/* Custom Color Input */}
            <input
              type="color"
              value={
                selectedText.backgroundColor && selectedText.backgroundColor !== 'transparent'
                  ? selectedText.backgroundColor
                  : '#FFFFFF'
              }
              onChange={(e) => onUpdateText({ backgroundColor: e.target.value.toUpperCase() })}
              className="w-5 h-5 rounded cursor-pointer border border-slate-300 dark:border-slate-600"
              title="Довільний колір тла"
            />

            {/* Browser EyeDropper tool */}
            {typeof window !== 'undefined' && 'EyeDropper' in window && (
              <button
                onClick={async () => {
                  try {
                    const dropper = new (window as any).EyeDropper();
                    const result = await dropper.open();
                    if (result?.sRGBHex) {
                      onUpdateText({ backgroundColor: result.sRGBHex.toUpperCase() });
                    }
                  } catch (err) {
                    // User canceled eyedropper
                  }
                }}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Піпетка: взяти точний колір з екрану"
              >
                <Pipette className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Transparent option toggle */}
            <button
              onClick={() =>
                onUpdateText({
                  backgroundColor: selectedText.backgroundColor === 'transparent' ? '#FFFFFF' : 'transparent',
                })
              }
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                selectedText.backgroundColor === 'transparent'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title="Прозоре тло (без перекриття маскою)"
            >
              Без маски
            </button>
          </div>
        </div>

        {/* Layer order */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5 ml-1">
          <button
            onClick={() => onUpdateText({ zIndex: 25 })}
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити текст на передній план (поверх фігур)"
          >
            <BringToFront className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Вперед</span>
          </button>
          <button
            onClick={() => onUpdateText({ zIndex: 2 })}
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити текст на задній план (під фігури)"
          >
            <SendToBack className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Назад</span>
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDeleteText(selectedText.id)}
          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
          title="Видалити цей текстовий блок"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 2. Image Properties (when an image is selected)
  if (selectedImage) {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs overflow-x-auto z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Зображення:
        </span>

        {/* Rotate */}
        <button
          onClick={() => onUpdateImage({ rotation: ((selectedImage.rotation || 0) + 90) % 360 })}
          className="flex items-center space-x-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
          title="Повернути на 90° за годинниковою стрілкою"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Повернути 90°</span>
        </button>

        {/* Flip X / Flip Y */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => onUpdateImage({ flipX: !selectedImage.flipX })}
            className={`p-1 rounded ${
              selectedImage.flipX
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="Відобразити по горизонталі"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateImage({ flipY: !selectedImage.flipY })}
            className={`p-1 rounded ${
              selectedImage.flipY
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
            title="Відобразити по вертикалі"
          >
            <FlipVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Opacity */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 dark:text-slate-400">Прозорість:</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={selectedImage.opacity ?? 1}
            onChange={(e) => onUpdateImage({ opacity: parseFloat(e.target.value) })}
            className="w-20 cursor-pointer"
          />
          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
            {Math.round((selectedImage.opacity ?? 1) * 100)}%
          </span>
        </div>

        {/* Layer order */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            onClick={() => onUpdateImage({ zIndex: 25 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити зображення на передній план"
          >
            <BringToFront className="w-3.5 h-3.5" />
            <span>На передній план</span>
          </button>
          <button
            onClick={() => onUpdateImage({ zIndex: 2 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити зображення на задній план"
          >
            <SendToBack className="w-3.5 h-3.5" />
            <span>На задній план</span>
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDeleteImage(selectedImage.id)}
          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
          title="Видалити зображення"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3. Shape Properties (when a shape is selected)
  if (selectedShape) {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs overflow-x-auto z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Фігура:
        </span>

        {/* Stroke Color */}
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 dark:text-slate-400">Контур:</span>
          <input
            type="color"
            value={selectedShape.strokeColor}
            onChange={(e) => onUpdateShape({ strokeColor: e.target.value })}
            className="w-5 h-5 rounded cursor-pointer border border-slate-300"
          />
        </div>

        {/* Fill Color */}
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 dark:text-slate-400">Заливка:</span>
          <select
            value={selectedShape.fillColor}
            onChange={(e) => onUpdateShape({ fillColor: e.target.value })}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 outline-none text-xs"
          >
            <option value="transparent">Без заливки (Прозора)</option>
            <option value="#FFFFFF">Біла (#FFFFFF)</option>
            <option value="#FEF08A">Жовта (#FEF08A)</option>
            <option value="#BAE6FD">Блакитна (#BAE6FD)</option>
            <option value="#BBF7D0">Зелена (#BBF7D0)</option>
            <option value="#FEE2E2">Червона (#FEE2E2)</option>
          </select>
        </div>

        {/* Stroke Width */}
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 dark:text-slate-400">Товщина:</span>
          <select
            value={selectedShape.strokeWidth}
            onChange={(e) => onUpdateShape({ strokeWidth: parseInt(e.target.value) })}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 outline-none text-xs"
          >
            <option value="1">1 px</option>
            <option value="2">2 px</option>
            <option value="3">3 px</option>
            <option value="5">5 px</option>
            <option value="8">8 px</option>
          </select>
        </div>

        {/* Opacity */}
        <div className="flex items-center space-x-1 pl-1 border-l border-slate-200 dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400">Прозорість:</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={selectedShape.opacity ?? 1}
            onChange={(e) => onUpdateShape({ opacity: parseFloat(e.target.value) })}
            className="w-16 cursor-pointer"
          />
          <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
            {Math.round((selectedShape.opacity ?? 1) * 100)}%
          </span>
        </div>

        {/* Layer order */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5 ml-1">
          <button
            onClick={() => onUpdateShape({ zIndex: 25 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити фігуру на передній план (поверх тексту)"
          >
            <BringToFront className="w-3.5 h-3.5" />
            <span>На передній план</span>
          </button>
          <button
            onClick={() => onUpdateShape({ zIndex: 2 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити фігуру на задній план (під текст)"
          >
            <SendToBack className="w-3.5 h-3.5" />
            <span>На задній план</span>
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDeleteShape(selectedShape.id)}
          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
          title="Видалити фігуру"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3b. Stamp Properties
  if (selectedStamp) {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs overflow-x-auto z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Штамп: {selectedStamp.text}
        </span>
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 dark:text-slate-400">Колір:</span>
          {['#DC2626', '#2563EB', '#16A34A', '#000000'].map((c) => (
            <button
              key={c}
              onClick={() => onUpdateStamp?.({ color: c })}
              className={`w-4 h-4 rounded-full border ${selectedStamp.color === c ? 'ring-2 ring-blue-500 scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={selectedStamp.color}
            onChange={(e) => onUpdateStamp?.({ color: e.target.value })}
            className="w-5 h-5 rounded cursor-pointer border border-slate-300"
          />
        </div>
        <button
          onClick={() => onUpdateStamp?.({ rotation: ((selectedStamp.rotation || 0) + 15) % 360 })}
          className="flex items-center space-x-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 transition-colors"
          title="Повернути штамп"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Поворот</span>
        </button>

        {/* Layer order */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            onClick={() => onUpdateStamp?.({ zIndex: 25 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити штамп на передній план"
          >
            <BringToFront className="w-3.5 h-3.5" />
            <span>На передній план</span>
          </button>
          <button
            onClick={() => onUpdateStamp?.({ zIndex: 2 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити штамп на задній план"
          >
            <SendToBack className="w-3.5 h-3.5" />
            <span>На задній план</span>
          </button>
        </div>

        <button
          onClick={() => onDeleteStamp?.(selectedStamp.id)}
          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
          title="Видалити штамп"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3c. Signature Properties
  if (selectedSignature) {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs overflow-x-auto z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Підпис
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 dark:text-slate-400">Прозорість:</span>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={selectedSignature.opacity ?? 1}
            onChange={(e) => onUpdateSignature?.({ opacity: parseFloat(e.target.value) })}
            className="w-20 cursor-pointer"
          />
          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
            {Math.round((selectedSignature.opacity ?? 1) * 100)}%
          </span>
        </div>

        {/* Layer order */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            onClick={() => onUpdateSignature?.({ zIndex: 25 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити підпис на передній план"
          >
            <BringToFront className="w-3.5 h-3.5" />
            <span>На передній план</span>
          </button>
          <button
            onClick={() => onUpdateSignature?.({ zIndex: 2 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити підпис на задній план"
          >
            <SendToBack className="w-3.5 h-3.5" />
            <span>На задній план</span>
          </button>
        </div>

        <button
          onClick={() => onDeleteSignature?.(selectedSignature.id)}
          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
          title="Видалити підпис"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3d. Whiteout Properties
  if (selectedWhiteout) {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs overflow-x-auto z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Маскування / Заливка:
        </span>
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 dark:text-slate-400">Колір:</span>
          {['#FFFFFF', '#143873', '#F1F5F9', '#000000'].map((c) => (
            <button
              key={c}
              onClick={() => onUpdateWhiteout?.({ color: c })}
              className={`w-4 h-4 rounded-full border ${selectedWhiteout.color === c ? 'ring-2 ring-blue-500 scale-110' : ''}`}
              style={{ backgroundColor: c, borderColor: '#94A3B8' }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={selectedWhiteout.color || '#FFFFFF'}
            onChange={(e) => onUpdateWhiteout?.({ color: e.target.value })}
            className="w-5 h-5 rounded cursor-pointer border border-slate-300"
          />
        </div>

        {/* Layer order */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            onClick={() => onUpdateWhiteout?.({ zIndex: 25 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити коректор на передній план"
          >
            <BringToFront className="w-3.5 h-3.5" />
            <span>На передній план</span>
          </button>
          <button
            onClick={() => onUpdateWhiteout?.({ zIndex: 2 })}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Перемістити коректор на задній план"
          >
            <SendToBack className="w-3.5 h-3.5" />
            <span>На задній план</span>
          </button>
        </div>

        <button
          onClick={() => onDeleteWhiteout?.(selectedWhiteout.id)}
          className="ml-auto p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
          title="Видалити коректор"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 4. Pen Mode Bar
  if (activeTool === 'pen') {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Олівець:
        </span>
        <div className="flex items-center space-x-1">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => onPenColorChange(c)}
              className={`w-5 h-5 rounded-full border transition-transform ${
                penColor === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-1' : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c, borderColor: '#CBD5E1' }}
            />
          ))}
          <input
            type="color"
            value={penColor}
            onChange={(e) => onPenColorChange(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer ml-1"
          />
        </div>

        <div className="flex items-center space-x-1 ml-4">
          <span className="text-slate-500 dark:text-slate-400">Товщина:</span>
          {[1, 2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => onPenWidthChange(w)}
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                penWidth === w
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 5. Highlighter Mode Bar
  if (activeTool === 'highlighter') {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Маркер (Хайлайтер):
        </span>
        <div className="flex items-center space-x-1.5">
          {HIGHLIGHTER_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => onHighlighterColorChange(c)}
              className={`w-6 h-6 rounded-md border transition-transform shadow-sm ${
                highlighterColor === c ? 'scale-110 ring-2 ring-blue-500' : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c, borderColor: '#E2E8F0' }}
            />
          ))}
        </div>

        <div className="flex items-center space-x-1 ml-4">
          <span className="text-slate-500 dark:text-slate-400">Ширина:</span>
          {[8, 14, 20, 28].map((w) => (
            <button
              key={w}
              onClick={() => onHighlighterWidthChange(w)}
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                highlighterWidth === w
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 6. Shape Mode Bar (selection of shape type)
  if (activeTool === 'shape') {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Оберіть фігуру:
        </span>
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => onShapeTypeChange('rectangle')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium ${
              activeShapeType === 'rectangle' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Прямокутник</span>
          </button>
          <button
            onClick={() => onShapeTypeChange('circle')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium ${
              activeShapeType === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Circle className="w-3.5 h-3.5" />
            <span>Коло / Овал</span>
          </button>
          <button
            onClick={() => onShapeTypeChange('arrow')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium ${
              activeShapeType === 'arrow' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <MoveRight className="w-3.5 h-3.5" />
            <span>Стрілка</span>
          </button>
          <button
            onClick={() => onShapeTypeChange('line')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium ${
              activeShapeType === 'line' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span>Лінія</span>
          </button>
        </div>
        <span className="text-slate-400 text-[11px] ml-2">
          (Затисніть ліву кнопку миші на документі та потягніть для створення)
        </span>
      </div>
    );
  }

  // 7. Whiteout Mode Bar
  if (activeTool === 'whiteout') {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs z-10 transition-colors">
        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
          Коректор / Маскування:
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          Виділіть область на документі прямокутником, щоб стерти / зафарбувати старий текст або конфіденційні дані.
        </span>
      </div>
    );
  }

  // 8. In-place Text Edit mode hint
  if (activeTool === 'editText') {
    return (
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center space-x-3 text-xs z-10 transition-colors">
        <span className="font-semibold text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-wider mr-1">
          Режим редагування:
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          Клікніть на будь-який рядок тексту у документі нижче, щоб відредагувати його зміст прямо на місці!
        </span>
      </div>
    );
  }

  // Default empty bar or subtle guide
  return null;
};
