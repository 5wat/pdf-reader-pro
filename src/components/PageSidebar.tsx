import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  RotateCw,
  Copy,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PageInfo } from '../types/pdf';

interface PageSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pages: PageInfo[];
  pageOrder: number[];
  deletedPages: number[];
  pageRotations?: Record<number, number>;
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onAddBlankPage: () => void;
}

const PageThumbnail: React.FC<{
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageIndex: number;
  rotation: number;
}> = ({ pdfDoc, pageIndex, rotation }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: any = null;

    const renderThumb = async () => {
      if (!pdfDoc || pageIndex >= pdfDoc.numPages) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const page = await pdfDoc.getPage(pageIndex + 1);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const totalRotation = ((page.rotate || 0) + rotation) % 360;
        const unscaledViewport = page.getViewport({ scale: 1, rotation: totalRotation });
        const scale = 180 / unscaledViewport.width;
        const viewport = page.getViewport({ scale, rotation: totalRotation });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext: any = {
          canvasContext: ctx,
          viewport,
        };
        if (dpr !== 1) {
          renderContext.transform = [dpr, 0, 0, dpr, 0, 0];
        }

        renderTask = page.render(renderContext);
        await renderTask.promise;

        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          setIsLoading(false);
        }
      }
    };

    renderThumb();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageIndex, rotation]);

  return (
    <div className="w-full aspect-[1/1.414] bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!pdfDoc && !isLoading && (
        <div className="w-full h-full bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] text-slate-400">
          Чистий аркуш
        </div>
      )}
    </div>
  );
};

export const PageSidebar: React.FC<PageSidebarProps> = ({
  isOpen,
  onToggle,
  pdfDoc,
  pages,
  pageOrder,
  deletedPages,
  pageRotations = {},
  currentPageIndex,
  onSelectPage,
  onRotatePage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onAddBlankPage,
}) => {
  const visiblePages = pageOrder.filter((idx) => !deletedPages.includes(idx));

  if (!isOpen) {
    return (
      <div className="w-8 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-2 z-10 transition-all">
        <button
          onClick={onToggle}
          className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Показати бічну панель сторінок"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-10 select-none transition-colors">
      {/* Sidebar header */}
      <div className="h-10 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center space-x-1.5">
          <span>Сторінки</span>
          <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400">
            {visiblePages.length}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
          title="Згорнути бічну панель"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {visiblePages.map((pageIdx, displayPos) => {
          const pageInfo = pages[pageIdx];
          const isSelected = currentPageIndex === pageIdx;

          return (
            <div
              key={`page-${pageIdx}-${displayPos}`}
              onClick={() => onSelectPage(pageIdx)}
              className={`group relative rounded-lg border-2 p-2 transition-all cursor-pointer bg-white dark:bg-slate-800/80 ${
                isSelected
                  ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Header row: Page number and action icons */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Стор. {displayPos + 1}
                </span>

                {/* Quick actions bar */}
                <div className="flex items-center space-x-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {/* Move Up */}
                  {displayPos > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(displayPos, displayPos - 1);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Перемістити вище"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}

                  {/* Move Down */}
                  {displayPos < visiblePages.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(displayPos, displayPos + 1);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Перемістити нижче"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}

                  {/* Rotate */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRotatePage(pageIdx);
                    }}
                    className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Повернути на 90°"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(pageIdx);
                    }}
                    className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Дублювати сторінку"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  {/* Delete */}
                  {visiblePages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(pageIdx);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Видалити сторінку"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Page Miniature Real Render */}
              <div className="relative">
                <PageThumbnail
                  pdfDoc={pdfDoc}
                  pageIndex={pageIdx}
                  rotation={pageRotations[pageIdx] || 0}
                />
                {pageInfo && (
                  <span className="absolute bottom-1 right-2 text-[9px] text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-1 py-0.5 rounded font-mono shadow-xs">
                    {Math.round(pageInfo.width)}×{Math.round(pageInfo.height)} pt
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom: Add Page Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          onClick={onAddBlankPage}
          className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-300 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Додати нову сторінку A4</span>
        </button>
      </div>
    </aside>
  );
};
