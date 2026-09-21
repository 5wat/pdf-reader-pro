import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderPage } from '../services/pdfRenderer';
import { sampleColorsForTextBlock } from '../utils/colorDetector';
import { CanvasOverlay } from './CanvasOverlay';
import {
  ToolMode,
  TextBlock,
  ImageElement,
  DrawingElement,
  ShapeElement,
  WhiteoutElement,
  StampElement,
  SignatureElement,
  ShapeType,
  PageInfo,
} from '../types/pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PdfViewerProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPageIndex: number;
  onPageChange: (index: number) => void;
  pages: PageInfo[];
  pageOrder: number[];
  deletedPages: number[];
  pageRotations: Record<number, number>;
  scale: number;
  toolMode: ToolMode;

  textBlocks: TextBlock[];
  onUpdateTextBlock: (id: string, updates: Partial<TextBlock>) => void;
  onBatchUpdateTextBlocks?: (updatesMap: Record<string, Partial<TextBlock>>, shouldRecord?: boolean) => void;
  onAddTextBlock: (block: TextBlock) => void;
  onSelectTextBlock: (block: TextBlock | null) => void;
  selectedTextId: string | null;

  images: ImageElement[];
  onUpdateImage: (id: string, updates: Partial<ImageElement>) => void;
  onSelectImage: (img: ImageElement | null) => void;
  selectedImageId: string | null;

  shapes: ShapeElement[];
  onAddShape: (shape: ShapeElement) => void;
  onUpdateShape?: (id: string, updates: Partial<ShapeElement>) => void;
  onSelectShape: (shape: ShapeElement | null) => void;
  selectedShapeId: string | null;

  drawings: DrawingElement[];
  onAddDrawing: (drawing: DrawingElement) => void;

  whiteouts: WhiteoutElement[];
  onAddWhiteout: (w: WhiteoutElement) => void;
  onUpdateWhiteout?: (id: string, updates: Partial<WhiteoutElement>) => void;
  onSelectWhiteout?: (w: WhiteoutElement | null) => void;
  selectedWhiteoutId?: string | null;

  stamps: StampElement[];
  onUpdateStamp?: (id: string, updates: Partial<StampElement>) => void;
  onSelectStamp?: (stamp: StampElement | null) => void;
  selectedStampId?: string | null;

  signatures: SignatureElement[];
  onUpdateSignature?: (id: string, updates: Partial<SignatureElement>) => void;
  onSelectSignature?: (sig: SignatureElement | null) => void;
  selectedSignatureId?: string | null;

  penColor: string;
  penWidth: number;
  highlighterColor: string;
  highlighterWidth: number;
  activeShapeType: ShapeType;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDoc,
  currentPageIndex,
  onPageChange,
  pages,
  pageOrder,
  deletedPages,
  pageRotations,
  scale,
  toolMode,
  textBlocks,
  onUpdateTextBlock,
  onBatchUpdateTextBlocks,
  onAddTextBlock,
  onSelectTextBlock,
  selectedTextId,
  images,
  onUpdateImage,
  onSelectImage,
  selectedImageId,
  shapes,
  onAddShape,
  onUpdateShape,
  onSelectShape,
  selectedShapeId,
  drawings,
  onAddDrawing,
  whiteouts,
  onAddWhiteout,
  onUpdateWhiteout,
  onSelectWhiteout,
  selectedWhiteoutId,
  stamps,
  onUpdateStamp,
  onSelectStamp,
  selectedStampId,
  signatures,
  onUpdateSignature,
  onSelectSignature,
  selectedSignatureId,
  penColor,
  penWidth,
  highlighterColor,
  highlighterWidth,
  activeShapeType,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 595 * scale,
    height: 842 * scale,
  });
  const [renderTimestamp, setRenderTimestamp] = useState<number>(0);

  const visiblePages = pageOrder.filter((idx) => !deletedPages.includes(idx));
  const currentDisplayPosition = visiblePages.indexOf(currentPageIndex);

  // 1. Render PDF.js page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isMounted = true;
    const pageNumber = currentPageIndex + 1;
    const extraRotation = pageRotations[currentPageIndex] || 0;

    renderPage(pdfDoc, pageNumber, canvasRef.current, scale, extraRotation)
      .then((result) => {
        if (isMounted) {
          setPageDimensions({ width: result.width, height: result.height });
          setRenderTimestamp(Date.now());
        }
      })
      .catch((err) => {
        console.error('Error rendering PDF page:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, currentPageIndex, scale, pageRotations]);

  // 2. Pre-sample colors for uncolored text blocks as soon as canvas is ready or textBlocks load
  useEffect(() => {
    if (!canvasRef.current || renderTimestamp === 0) return;

    const uncoloredBlocks = textBlocks.filter(
      (tb) => tb.pageIndex === currentPageIndex && (!tb.backgroundColor || tb.backgroundColor === 'transparent') && !tb.isModified
    );
    if (uncoloredBlocks.length === 0) return;

    const updatesMap: Record<string, { backgroundColor: string; color: string }> = {};
    uncoloredBlocks.forEach((tb) => {
      const sampled = sampleColorsForTextBlock(canvasRef.current!, tb, scale);
      updatesMap[tb.id] = sampled;
    });

    if (onBatchUpdateTextBlocks) {
      onBatchUpdateTextBlocks(updatesMap, false);
    } else {
      Object.entries(updatesMap).forEach(([id, upd]) => {
        onUpdateTextBlock(id, upd);
      });
    }
  }, [renderTimestamp, textBlocks, currentPageIndex, scale, onBatchUpdateTextBlocks, onUpdateTextBlock]);

  const currentPageInfo = pages[currentPageIndex];

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center pt-6 pb-[65vh] px-4 relative select-none transition-colors"
    >
      {/* PDF Page Container */}
      <div
        className="relative bg-white shadow-2xl rounded-sm transition-all"
        style={{
          width: pageDimensions.width,
          height: pageDimensions.height,
        }}
      >
        {/* PDF.js Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block rounded-sm pointer-events-none"
        />

        {/* Interactive Editing Layer */}
        <CanvasOverlay
          pageIndex={currentPageIndex}
          width={pageDimensions.width}
          height={pageDimensions.height}
          scale={scale}
          toolMode={toolMode}
          canvasRef={canvasRef}
          textBlocks={textBlocks.filter((tb) => tb.pageIndex === currentPageIndex)}
          onUpdateTextBlock={onUpdateTextBlock}
          onAddTextBlock={onAddTextBlock}
          onSelectTextBlock={onSelectTextBlock}
          selectedTextId={selectedTextId}
          images={images.filter((img) => img.pageIndex === currentPageIndex)}
          onUpdateImage={onUpdateImage}
          onSelectImage={onSelectImage}
          selectedImageId={selectedImageId}
          shapes={shapes.filter((s) => s.pageIndex === currentPageIndex)}
          onAddShape={onAddShape}
          onUpdateShape={onUpdateShape}
          onSelectShape={onSelectShape}
          selectedShapeId={selectedShapeId}
          drawings={drawings.filter((d) => d.pageIndex === currentPageIndex)}
          onAddDrawing={onAddDrawing}
          whiteouts={whiteouts.filter((w) => w.pageIndex === currentPageIndex)}
          onAddWhiteout={onAddWhiteout}
          onUpdateWhiteout={onUpdateWhiteout}
          onSelectWhiteout={onSelectWhiteout}
          selectedWhiteoutId={selectedWhiteoutId}
          stamps={stamps.filter((s) => s.pageIndex === currentPageIndex)}
          onUpdateStamp={onUpdateStamp}
          onSelectStamp={onSelectStamp}
          selectedStampId={selectedStampId}
          signatures={signatures.filter((s) => s.pageIndex === currentPageIndex)}
          onUpdateSignature={onUpdateSignature}
          onSelectSignature={onSelectSignature}
          selectedSignatureId={selectedSignatureId}
          penColor={penColor}
          penWidth={penWidth}
          highlighterColor={highlighterColor}
          highlighterWidth={highlighterWidth}
          activeShapeType={activeShapeType}
        />
      </div>

      {/* Bottom Overscroll Spacer: allows user to scroll bottom of page into center of screen */}
      <div className="h-[55vh] shrink-0 pointer-events-none w-full" aria-hidden="true" />

      {/* Floating Bottom Page Navigator */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-800 flex items-center space-x-3 text-xs font-semibold text-slate-700 dark:text-slate-200 z-30 transition-all opacity-85 hover:opacity-100 shadow-slate-900/10 dark:shadow-black/40">
        <button
          onClick={() => {
            if (currentDisplayPosition > 0) {
              onPageChange(visiblePages[currentDisplayPosition - 1]);
            }
          }}
          disabled={currentDisplayPosition <= 0}
          className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Попередня сторінка"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="tabular-nums">
          {currentDisplayPosition + 1} / {visiblePages.length}
        </span>

        <button
          onClick={() => {
            if (currentDisplayPosition < visiblePages.length - 1) {
              onPageChange(visiblePages[currentDisplayPosition + 1]);
            }
          }}
          disabled={currentDisplayPosition >= visiblePages.length - 1}
          className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Наступна сторінка"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
