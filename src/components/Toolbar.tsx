import React from 'react';
import {
  MousePointer,
  FileEdit,
  Type,
  Image as ImageIcon,
  PenTool,
  Highlighter,
  Square,
  Eraser,
  Stamp,
  Signature,
} from 'lucide-react';
import { ToolMode } from '../types/pdf';

interface ToolbarProps {
  activeTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  onAddImageClick: () => void;
  onAddStampClick: () => void;
  onAddSignatureClick: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  onAddImageClick,
  onAddStampClick,
  onAddSignatureClick,
}) => {
  const tools: Array<{
    id: ToolMode;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    action?: () => void;
  }> = [
    {
      id: 'select',
      label: 'Вибір',
      icon: <MousePointer className="w-4 h-4" />,
      shortcut: 'V',
    },
    {
      id: 'editText',
      label: 'Редагувати вміст',
      icon: <FileEdit className="w-4 h-4" />,
      shortcut: 'E',
    },
    {
      id: 'addText',
      label: 'Текст',
      icon: <Type className="w-4 h-4" />,
      shortcut: 'T',
    },
    {
      id: 'addImage',
      label: 'Зображення',
      icon: <ImageIcon className="w-4 h-4" />,
      action: onAddImageClick,
      shortcut: 'I',
    },
    {
      id: 'pen',
      label: 'Олівець',
      icon: <PenTool className="w-4 h-4" />,
      shortcut: 'P',
    },
    {
      id: 'highlighter',
      label: 'Маркер',
      icon: <Highlighter className="w-4 h-4" />,
      shortcut: 'H',
    },
    {
      id: 'shape',
      label: 'Фігури',
      icon: <Square className="w-4 h-4" />,
      shortcut: 'U',
    },
    {
      id: 'whiteout',
      label: 'Коректор',
      icon: <Eraser className="w-4 h-4" />,
      shortcut: 'W',
    },
    {
      id: 'stamp',
      label: 'Штамп',
      icon: <Stamp className="w-4 h-4" />,
      action: onAddStampClick,
    },
    {
      id: 'signature',
      label: 'Підпис',
      icon: <Signature className="w-4 h-4" />,
      action: onAddSignatureClick,
      shortcut: 'S',
    },
  ];

  return (
    <div className="h-11 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-start space-x-1.5 overflow-x-auto z-20 shadow-sm transition-colors">
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            id={`tool-${t.id}`}
            onClick={() => {
              if (t.action) {
                t.action();
              } else {
                onSelectTool(t.id);
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
          >
            {t.icon}
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};
