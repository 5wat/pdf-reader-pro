import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Point,
} from '../types/pdf';
import { sampleColorsForTextBlock, isColorDark } from '../utils/colorDetector';

interface CanvasOverlayProps {
  pageIndex: number;
  width: number; // in screen pixels (pageWidth * scale)
  height: number; // in screen pixels (pageHeight * scale)
  scale: number;
  toolMode: ToolMode;
  canvasRef?: React.RefObject<HTMLCanvasElement>;

  textBlocks: TextBlock[];
  onUpdateTextBlock: (id: string, updates: Partial<TextBlock>) => void;
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

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  pageIndex,
  width,
  height,
  scale,
  toolMode,
  canvasRef,
  textBlocks,
  onUpdateTextBlock,
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active in-place text editing id
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Active drawing/dragging state
  const isInteracting = useRef<boolean>(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<Point[]>([]);
  const [liveShapeRect, setLiveShapeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Transform / Move state for images, text, shapes, stamps, signatures, whiteouts
  const [dragItem, setDragItem] = useState<{
    type: 'text' | 'image' | 'shape' | 'stamp' | 'signature' | 'whiteout';
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Resize state for images, shapes, and text
  const [resizeHandle, setResizeHandle] = useState<{
    type?: 'image' | 'shape' | 'text';
    id: string;
    handle: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Pointer Down on overlay
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, textarea, button, .resize-handle')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const ptX = screenX / scale;
    const ptY = screenY / scale;

    // 1. ADD TEXT MODE
    if (toolMode === 'addText') {
      let sampledBg = '#FFFFFF';
      let sampledColor = '#000000';
      if (canvasRef?.current) {
        const dummy = { x: Math.round(ptX), y: Math.round(ptY), width: 160, height: 28 } as TextBlock;
        const sampled = sampleColorsForTextBlock(canvasRef.current, dummy, scale);
        sampledBg = sampled.backgroundColor;
        sampledColor = sampled.color;
      }

      const newBlock: TextBlock = {
        id: `custom-text-${Date.now()}`,
        pageIndex,
        x: Math.round(ptX),
        y: Math.round(ptY),
        width: 160,
        height: 28,
        text: 'Введіть текст тут',
        fontSize: 14,
        fontFamily: 'Roboto',
        color: sampledColor,
        backgroundColor: sampledBg,
        align: 'left',
        isNew: true,
        isModified: true,
      };
      onAddTextBlock(newBlock);
      setEditingTextId(newBlock.id);
      return;
    }

    // 2. PEN or HIGHLIGHTER MODE
    if (toolMode === 'pen' || toolMode === 'highlighter') {
      isInteracting.current = true;
      startPoint.current = { x: ptX, y: ptY };
      setCurrentDrawingPoints([{ x: ptX, y: ptY }]);
      return;
    }

    // 3. SHAPE MODE
    if (toolMode === 'shape') {
      isInteracting.current = true;
      startPoint.current = { x: ptX, y: ptY };
      setLiveShapeRect({ x: ptX, y: ptY, w: 0, h: 0 });
      return;
    }

    // 4. WHITEOUT MODE
    if (toolMode === 'whiteout') {
      isInteracting.current = true;
      startPoint.current = { x: ptX, y: ptY };
      setLiveShapeRect({ x: ptX, y: ptY, w: 0, h: 0 });
      return;
    }

    // 5. Clicked on empty space: clear selections
    if (toolMode === 'select') {
      onSelectTextBlock(null);
      onSelectImage(null);
      onSelectShape(null);
      onSelectStamp?.(null);
      onSelectSignature?.(null);
      onSelectWhiteout?.(null);
      setEditingTextId(null);
    }
  };

  // Pointer Move on overlay
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const ptX = screenX / scale;
    const ptY = screenY / scale;

    // A. Dragging text, image, shape, stamp, signature, or whiteout
    if (dragItem) {
      const dx = ptX - dragItem.startX;
      const dy = ptY - dragItem.startY;
      if (dragItem.type === 'text') {
        onUpdateTextBlock(dragItem.id, {
          x: Math.round(dragItem.origX + dx),
          y: Math.round(dragItem.origY + dy),
          isModified: true,
        });
      } else if (dragItem.type === 'image') {
        onUpdateImage(dragItem.id, {
          x: Math.round(dragItem.origX + dx),
          y: Math.round(dragItem.origY + dy),
        });
      } else if (dragItem.type === 'shape' && onUpdateShape) {
        onUpdateShape(dragItem.id, {
          x: Math.round(dragItem.origX + dx),
          y: Math.round(dragItem.origY + dy),
        });
      } else if (dragItem.type === 'stamp' && onUpdateStamp) {
        onUpdateStamp(dragItem.id, {
          x: Math.round(dragItem.origX + dx),
          y: Math.round(dragItem.origY + dy),
        });
      } else if (dragItem.type === 'signature' && onUpdateSignature) {
        onUpdateSignature(dragItem.id, {
          x: Math.round(dragItem.origX + dx),
          y: Math.round(dragItem.origY + dy),
        });
      } else if (dragItem.type === 'whiteout' && onUpdateWhiteout) {
        onUpdateWhiteout(dragItem.id, {
          x: Math.round(dragItem.origX + dx),
          y: Math.round(dragItem.origY + dy),
        });
      }
      return;
    }

    // B. Resizing image or shape
    if (resizeHandle) {
      const dx = ptX - resizeHandle.startX;
      const dy = ptY - resizeHandle.startY;
      let newW = resizeHandle.origW;
      let newH = resizeHandle.origH;
      let newX = resizeHandle.origX;
      let newY = resizeHandle.origY;

      if (resizeHandle.handle.includes('e')) newW = Math.max(10, resizeHandle.origW + dx);
      if (resizeHandle.handle.includes('s')) newH = Math.max(10, resizeHandle.origH + dy);
      if (resizeHandle.handle.includes('w')) {
        const w = Math.max(10, resizeHandle.origW - dx);
        newX = resizeHandle.origX + (resizeHandle.origW - w);
        newW = w;
      }
      if (resizeHandle.handle.includes('n')) {
        const h = Math.max(10, resizeHandle.origH - dy);
        newY = resizeHandle.origY + (resizeHandle.origH - h);
        newH = h;
      }

      if (resizeHandle.type === 'shape') {
        onUpdateShape?.(resizeHandle.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      } else if (resizeHandle.type === 'text') {
        onUpdateTextBlock(resizeHandle.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
          isModified: true,
        });
      } else {
        onUpdateImage(resizeHandle.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      }
      return;
    }

    // C. Drawing (Pen / Highlighter)
    if (isInteracting.current && (toolMode === 'pen' || toolMode === 'highlighter')) {
      setCurrentDrawingPoints((prev) => [...prev, { x: ptX, y: ptY }]);
      return;
    }

    // D. Creating Shape or Whiteout
    if (isInteracting.current && (toolMode === 'shape' || toolMode === 'whiteout') && startPoint.current) {
      const minX = Math.min(startPoint.current.x, ptX);
      const minY = Math.min(startPoint.current.y, ptY);
      const w = Math.abs(ptX - startPoint.current.x);
      const h = Math.abs(ptY - startPoint.current.y);
      setLiveShapeRect({ x: minX, y: minY, w, h });
    }
  };

  // Pointer Up on overlay
  const handlePointerUp = () => {
    // End dragging
    if (dragItem) setDragItem(null);
    if (resizeHandle) setResizeHandle(null);

    // End drawing
    if (isInteracting.current) {
      if (toolMode === 'pen' || toolMode === 'highlighter') {
        if (currentDrawingPoints.length > 1) {
          onAddDrawing({
            id: `drawing-${Date.now()}`,
            pageIndex,
            points: currentDrawingPoints,
            color: toolMode === 'highlighter' ? highlighterColor : penColor,
            strokeWidth: toolMode === 'highlighter' ? highlighterWidth : penWidth,
            opacity: toolMode === 'highlighter' ? 0.4 : 1,
            isHighlighter: toolMode === 'highlighter',
          });
        }
        setCurrentDrawingPoints([]);
      } else if (toolMode === 'shape' && liveShapeRect && liveShapeRect.w > 4 && liveShapeRect.h > 4) {
        onAddShape({
          id: `shape-${Date.now()}`,
          pageIndex,
          type: activeShapeType,
          x: Math.round(liveShapeRect.x),
          y: Math.round(liveShapeRect.y),
          width: Math.round(liveShapeRect.w),
          height: Math.round(liveShapeRect.h),
          strokeColor: '#000000',
          fillColor: 'transparent',
          strokeWidth: 2,
          opacity: 1,
          zIndex: 15,
        });
        setLiveShapeRect(null);
      } else if (toolMode === 'whiteout' && liveShapeRect && liveShapeRect.w > 4 && liveShapeRect.h > 4) {
        onAddWhiteout({
          id: `whiteout-${Date.now()}`,
          pageIndex,
          x: Math.round(liveShapeRect.x),
          y: Math.round(liveShapeRect.y),
          width: Math.round(liveShapeRect.w),
          height: Math.round(liveShapeRect.h),
          color: '#FFFFFF',
        });
        setLiveShapeRect(null);
      }

      isInteracting.current = false;
      startPoint.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute inset-0 z-10 select-none ${
        toolMode === 'editText'
          ? 'cursor-text'
          : toolMode === 'addText'
          ? 'cursor-crosshair'
          : toolMode === 'pen' || toolMode === 'highlighter'
          ? 'cursor-crosshair'
          : toolMode === 'shape' || toolMode === 'whiteout'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
      style={{ width, height }}
    >
      {/* 0. BASE LAYER: ORIGINAL TEXT ERASURE MASKS (covers only original static text on PDF canvas) */}
      {textBlocks.map((block) => {
        if (block.isNew) return null;
        const isEditing = editingTextId === block.id;
        const shouldMask = block.isModified || block.isDeleted || isEditing;
        if (!shouldMask) return null;
        if (!block.backgroundColor || block.backgroundColor === 'transparent') return null;

        const origX = block.originalX !== undefined ? block.originalX : block.x;
        const origY = block.originalY !== undefined ? block.originalY : block.y;
        const origW = block.originalWidth !== undefined ? block.originalWidth : block.width;
        const origH = block.originalHeight !== undefined ? block.originalHeight : block.height;

        // Minimal precise padding: 1pt X, 0.8pt Y - tightest fit covering Cyrillic descenders without touching neighboring lines
        const padX = 1;
        const padY = 0.8;

        const left = (origX - padX) * scale;
        const top = (origY - padY) * scale;
        const bWidth = (Math.max(origW, block.width) + padX * 2) * scale;
        const bHeight = (Math.max(origH, block.height) + padY * 2) * scale;

        return (
          <div
            key={`orig-mask-${block.id}`}
            className="absolute pointer-events-none"
            style={{
              left,
              top,
              width: bWidth,
              height: bHeight,
              backgroundColor: block.backgroundColor,
              zIndex: 1,
            }}
          />
        );
      })}

      {/* 1. WHITEOUTS (Solid masking rectangles) */}
      {whiteouts.map((w) => {
        const isSelected = selectedWhiteoutId === w.id;
        return (
          <div
            key={w.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectWhiteout?.(w);
            }}
            onPointerDown={(e) => {
              if (toolMode === 'select') {
                e.stopPropagation();
                onSelectWhiteout?.(w);
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const ptX = (e.clientX - rect.left) / scale;
                const ptY = (e.clientY - rect.top) / scale;
                setDragItem({
                  type: 'whiteout',
                  id: w.id,
                  startX: ptX,
                  startY: ptY,
                  origX: w.x,
                  origY: w.y,
                });
              }
            }}
            className={`absolute shadow-sm ${
              toolMode === 'select' ? 'cursor-move' : ''
            } ${isSelected ? 'ring-2 ring-blue-500 rounded-sm' : ''}`}
            style={{
              left: w.x * scale,
              top: w.y * scale,
              width: w.width * scale,
              height: w.height * scale,
              backgroundColor: w.color || '#FFFFFF',
              zIndex: w.zIndex ?? 20,
            }}
          />
        );
      })}

      {/* 2. SHAPES (Rectangles, Circles, Lines, Arrows) */}
      {shapes.map((s) => {
        const sx = s.x * scale;
        const sy = s.y * scale;
        const sw = s.width * scale;
        const sh = s.height * scale;
        const isSelected = selectedShapeId === s.id;
        const isInteractive = toolMode === 'select';

        return (
          <div
            key={s.id}
            className={`absolute ${isInteractive ? 'cursor-move' : 'cursor-pointer'}`}
            style={{
              left: sx,
              top: sy,
              width: sw,
              height: sh,
              zIndex: s.zIndex ?? 15,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectShape(s);
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
              if (isInteractive) {
                e.stopPropagation();
                onSelectShape(s);
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const ptX = (e.clientX - rect.left) / scale;
                const ptY = (e.clientY - rect.top) / scale;
                setDragItem({
                  type: 'shape',
                  id: s.id,
                  startX: ptX,
                  startY: ptY,
                  origX: s.x,
                  origY: s.y,
                });
              }
            }}
          >
            <svg
              className="w-full h-full overflow-visible pointer-events-none"
              width={sw}
              height={sh}
            >
              {s.type === 'rectangle' && (
                <rect
                  x={0}
                  y={0}
                  width={sw}
                  height={sh}
                  stroke={isSelected ? '#3B82F6' : s.strokeColor}
                  strokeWidth={(isSelected ? Math.max(3, s.strokeWidth) : s.strokeWidth) * scale}
                  fill={s.fillColor}
                  opacity={s.opacity}
                />
              )}
              {s.type === 'circle' && (
                <ellipse
                  cx={sw / 2}
                  cy={sh / 2}
                  rx={Math.max(1, sw / 2)}
                  ry={Math.max(1, sh / 2)}
                  stroke={isSelected ? '#3B82F6' : s.strokeColor}
                  strokeWidth={(isSelected ? Math.max(3, s.strokeWidth) : s.strokeWidth) * scale}
                  fill={s.fillColor}
                  opacity={s.opacity}
                />
              )}
              {(s.type === 'line' || s.type === 'arrow') && (
                <g>
                  <line
                    x1={0}
                    y1={0}
                    x2={sw}
                    y2={sh}
                    stroke={isSelected ? '#3B82F6' : s.strokeColor}
                    strokeWidth={(isSelected ? Math.max(3, s.strokeWidth) : s.strokeWidth) * scale}
                    opacity={s.opacity}
                  />
                  {s.type === 'arrow' && (() => {
                    const angle = Math.atan2(sh, sw);
                    const headLength = Math.max(8, s.strokeWidth * scale * 3.5);
                    const x1 = sw - headLength * Math.cos(angle - Math.PI / 6);
                    const y1 = sh - headLength * Math.sin(angle - Math.PI / 6);
                    const x2 = sw - headLength * Math.cos(angle + Math.PI / 6);
                    const y2 = sh - headLength * Math.sin(angle + Math.PI / 6);
                    return (
                      <polygon
                        points={`${sw},${sh} ${x1},${y1} ${x2},${y2}`}
                        fill={isSelected ? '#3B82F6' : s.strokeColor}
                        opacity={s.opacity}
                      />
                    );
                  })()}
                </g>
              )}
            </svg>

            {/* Resize Handles (8 handles) when selected */}
            {isSelected && (s.type === 'rectangle' || s.type === 'circle') && (
              <>
                {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => {
                  let handleStyle: React.CSSProperties = {};
                  if (h === 'nw') handleStyle = { top: -4, left: -4, cursor: 'nwse-resize' };
                  if (h === 'n') handleStyle = { top: -4, left: '50%', marginLeft: -4, cursor: 'ns-resize' };
                  if (h === 'ne') handleStyle = { top: -4, right: -4, cursor: 'nesw-resize' };
                  if (h === 'e') handleStyle = { top: '50%', right: -4, marginTop: -4, cursor: 'ew-resize' };
                  if (h === 'se') handleStyle = { bottom: -4, right: -4, cursor: 'nwse-resize' };
                  if (h === 's') handleStyle = { bottom: -4, left: '50%', marginLeft: -4, cursor: 'ns-resize' };
                  if (h === 'sw') handleStyle = { bottom: -4, left: -4, cursor: 'nesw-resize' };
                  if (h === 'w') handleStyle = { top: '50%', left: -4, marginTop: -4, cursor: 'ew-resize' };

                  return (
                    <div
                      key={h}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const ptX = (e.clientX - rect.left) / scale;
                        const ptY = (e.clientY - rect.top) / scale;
                        setResizeHandle({
                          type: 'shape',
                          id: s.id,
                          handle: h,
                          startX: ptX,
                          startY: ptY,
                          origX: s.x,
                          origY: s.y,
                          origW: s.width,
                          origH: s.height,
                        });
                      }}
                      className="resize-handle absolute w-2.5 h-2.5 bg-blue-600 border border-white rounded-sm shadow-sm z-30"
                      style={handleStyle}
                    />
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      {/* 3. DRAWINGS & LIVE PREVIEWS LAYER */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={height}
        style={{ zIndex: 6 }}
      >
        {/* Render stored drawings (pen / highlighter) */}
        {drawings.map((d) => {
          const pathStr = d.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
            .join(' ');

          return (
            <path
              key={d.id}
              d={pathStr}
              fill="none"
              stroke={d.color}
              strokeWidth={d.strokeWidth * scale}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={d.opacity}
            />
          );
        })}

        {/* Live drawing preview */}
        {currentDrawingPoints.length > 1 && (
          <path
            d={currentDrawingPoints
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
              .join(' ')}
            fill="none"
            stroke={toolMode === 'highlighter' ? highlighterColor : penColor}
            strokeWidth={(toolMode === 'highlighter' ? highlighterWidth : penWidth) * scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={toolMode === 'highlighter' ? 0.4 : 1}
          />
        )}

        {/* Live shape preview during drag */}
        {liveShapeRect && (
          <rect
            x={liveShapeRect.x * scale}
            y={liveShapeRect.y * scale}
            width={liveShapeRect.w * scale}
            height={liveShapeRect.h * scale}
            stroke={toolMode === 'whiteout' ? '#94A3B8' : '#2563EB'}
            strokeWidth={1.5}
            strokeDasharray="4,4"
            fill={toolMode === 'whiteout' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(37, 99, 235, 0.1)'}
          />
        )}
      </svg>

      {/* 4. TEXT BLOCKS (In-Place Edit + Formatting) */}
      {textBlocks.map((block) => {
        if (block.isDeleted) return null;

        const isEditing = editingTextId === block.id;
        const isSelected = selectedTextId === block.id;
        const isModifiedOrNew = block.isModified || block.isNew;

        const left = block.x * scale;
        const top = block.y * scale;
        const bWidth = block.width * scale;
        const bHeight = block.height * scale;
        const fontSizePx = block.fontSize * scale;

        const solidBg =
          block.backgroundColor && block.backgroundColor !== 'transparent'
            ? block.backgroundColor
            : '#FFFFFF';

        return (
          <div
            key={block.id}
            onClick={(e) => {
              if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
              e.stopPropagation();
              let curBg = block.backgroundColor;
              let curColor = block.color;
              if ((!curBg || !block.isModified) && canvasRef?.current) {
                const sampled = sampleColorsForTextBlock(canvasRef.current, block, scale);
                curBg = sampled.backgroundColor;
                if (!block.isModified) {
                  curColor = sampled.color;
                }
              }
              const isEnteringEdit = toolMode === 'editText';

              let neededW = block.width;
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.font = `${block.isBold ? 'bold ' : ''}${block.fontSize}px ${block.fontFamily || 'sans-serif'}`;
                  const lines = block.text.split('\n');
                  const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
                  if (maxLineWidth > block.width - 6) {
                    neededW = Math.ceil(maxLineWidth + 14);
                  }
                }
              } catch {}

              onUpdateTextBlock(block.id, {
                backgroundColor: curBg,
                color: curColor,
                width: neededW,
                ...(isEnteringEdit ? { isModified: true } : {}),
              });
              onSelectTextBlock(block);
              if (isEnteringEdit) {
                setEditingTextId(block.id);
              }
            }}
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
              e.stopPropagation();
              let curBg = block.backgroundColor;
              let curColor = block.color;
              if ((!curBg || !block.isModified) && canvasRef?.current) {
                const sampled = sampleColorsForTextBlock(canvasRef.current, block, scale);
                curBg = sampled.backgroundColor;
                if (!block.isModified) {
                  curColor = sampled.color;
                }
              }

              let neededW = block.width;
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.font = `${block.isBold ? 'bold ' : ''}${block.fontSize}px ${block.fontFamily || 'sans-serif'}`;
                  const lines = block.text.split('\n');
                  const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
                  if (maxLineWidth > block.width - 6) {
                    neededW = Math.ceil(maxLineWidth + 14);
                  }
                }
              } catch {}

              onUpdateTextBlock(block.id, {
                backgroundColor: curBg,
                color: curColor,
                width: neededW,
                isModified: true,
              });
              onSelectTextBlock(block);
              setEditingTextId(block.id);
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
              if (toolMode === 'select' && !isEditing) {
                e.stopPropagation();
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const ptX = (e.clientX - rect.left) / scale;
                const ptY = (e.clientY - rect.top) / scale;
                setDragItem({
                  type: 'text',
                  id: block.id,
                  startX: ptX,
                  startY: ptY,
                  origX: block.x,
                  origY: block.y,
                });
              }
            }}
            className={`absolute transition-shadow ${
              toolMode === 'editText'
                ? 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-blue-500 cursor-text'
                : toolMode === 'select'
                ? 'cursor-move'
                : ''
            } ${
              isSelected && !isEditing
                ? 'ring-2 ring-blue-500 rounded-sm'
                : ''
            }`}
            style={{
              left,
              top,
              width: bWidth,
              height: bHeight,
              backgroundColor: 'transparent',
              zIndex: isSelected ? 25 : (block.zIndex || 10),
              fontFamily: block.fontFamily,
              color: block.color,
              fontWeight: block.isBold ? 'bold' : 'normal',
              fontStyle: block.isItalic ? 'italic' : 'normal',
              textDecoration: [
                block.isUnderline ? 'underline' : '',
                block.isStrikethrough ? 'line-through' : '',
              ]
                .filter(Boolean)
                .join(' '),
              textAlign: block.align || 'left',
              fontSize: `${fontSizePx}px`,
              lineHeight: 1.05,
            }}
          >
            {isEditing ? (
              <textarea
                autoFocus
                rows={block.text.split('\n').length || 1}
                value={block.text}
                onChange={(e) => {
                  const newText = e.target.value;
                  let newWidth = block.width;
                  try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.font = `${block.isBold ? 'bold ' : ''}${block.fontSize}px ${block.fontFamily || 'sans-serif'}`;
                      const lines = newText.split('\n');
                      const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
                      if (maxLineWidth > block.width - 6) {
                        newWidth = Math.ceil(maxLineWidth + 16);
                      }
                    }
                  } catch {}

                  const linesCount = newText.split('\n').length;
                  const minHeight = Math.max(block.height, Math.round(linesCount * block.fontSize * 1.25));

                  onUpdateTextBlock(block.id, {
                    text: newText,
                    width: newWidth,
                    height: minHeight,
                    isModified: true,
                  });
                }}
                onBlur={() => setEditingTextId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingTextId(null);
                  if (e.key === 'Enter' && !e.shiftKey) {
                    setEditingTextId(null);
                  }
                }}
                className="w-full h-full p-0 m-0 outline-none resize-none overflow-hidden"
                style={{
                  fontSize: `${fontSizePx}px`,
                  fontFamily: block.fontFamily,
                  color:
                    block.color ||
                    (isColorDark(solidBg) ? '#FFFFFF' : '#000000'),
                  backgroundColor: 'transparent',
                  fontWeight: block.isBold ? 'bold' : 'normal',
                  fontStyle: block.isItalic ? 'italic' : 'normal',
                  textAlign: block.align || 'left',
                  lineHeight: 1.05,
                  whiteSpace: block.text.includes('\n') ? 'pre-wrap' : 'nowrap',
                  border: '1px dashed #3B82F6',
                  boxSizing: 'border-box',
                }}
              />
            ) : isModifiedOrNew ? (
              <div
                className={`w-full h-full leading-[1.05] ${
                  block.text.includes('\n') ? 'whitespace-pre-wrap' : 'whitespace-nowrap'
                }`}
                style={{
                  backgroundColor: 'transparent',
                  color: block.color,
                }}
              >
                {block.text}
              </div>
            ) : (
              // Transparent placeholder allowing original rendered PDF canvas text to show through
              <div className="w-full h-full opacity-0 whitespace-nowrap">
                {block.text}
              </div>
            )}

            {/* Resize Handles (8 handles) for resizing text block width and height */}
            {(isSelected || isEditing) && (
              <>
                {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((handle) => {
                  let cursor = 'cursor-pointer';
                  let handleStyle: React.CSSProperties = {};
                  const size = 8;
                  const half = size / 2;

                  if (handle === 'nw') {
                    cursor = 'cursor-nwse-resize';
                    handleStyle = { left: -half, top: -half };
                  } else if (handle === 'ne') {
                    cursor = 'cursor-nesw-resize';
                    handleStyle = { right: -half, top: -half };
                  } else if (handle === 'sw') {
                    cursor = 'cursor-nesw-resize';
                    handleStyle = { left: -half, bottom: -half };
                  } else if (handle === 'se') {
                    cursor = 'cursor-nwse-resize';
                    handleStyle = { right: -half, bottom: -half };
                  } else if (handle === 'n') {
                    cursor = 'cursor-ns-resize';
                    handleStyle = { left: '50%', top: -half, transform: 'translateX(-50%)' };
                  } else if (handle === 's') {
                    cursor = 'cursor-ns-resize';
                    handleStyle = { left: '50%', bottom: -half, transform: 'translateX(-50%)' };
                  } else if (handle === 'w') {
                    cursor = 'cursor-ew-resize';
                    handleStyle = { left: -half, top: '50%', transform: 'translateY(-50%)' };
                  } else if (handle === 'e') {
                    cursor = 'cursor-ew-resize';
                    handleStyle = { right: -half, top: '50%', transform: 'translateY(-50%)' };
                  }

                  return (
                    <div
                      key={handle}
                      className={`resize-handle absolute w-2 h-2 bg-white border-2 border-blue-600 rounded-sm shadow-sm z-30 ${cursor}`}
                      style={handleStyle}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const ptX = (e.clientX - rect.left) / scale;
                        const ptY = (e.clientY - rect.top) / scale;
                        setResizeHandle({
                          type: 'text',
                          id: block.id,
                          handle,
                          startX: ptX,
                          startY: ptY,
                          origX: block.x,
                          origY: block.y,
                          origW: block.width,
                          origH: block.height,
                        });
                      }}
                    />
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      {/* 4. IMAGES (with 8 resize handles and rotation) */}
      {images.map((img) => {
        const isSelected = selectedImageId === img.id;
        const left = img.x * scale;
        const top = img.y * scale;
        const imgW = img.width * scale;
        const imgH = img.height * scale;

        return (
          <div
            key={img.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectImage(img);
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
              e.stopPropagation();
              onSelectImage(img);
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              const ptX = (e.clientX - rect.left) / scale;
              const ptY = (e.clientY - rect.top) / scale;
              setDragItem({
                type: 'image',
                id: img.id,
                startX: ptX,
                startY: ptY,
                origX: img.x,
                origY: img.y,
              });
            }}
            className={`absolute cursor-move ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg' : 'hover:ring-1 hover:ring-blue-400'
            }`}
            style={{
              left,
              top,
              width: imgW,
              height: imgH,
              transform: `rotate(${img.rotation || 0}deg) scaleX(${img.flipX ? -1 : 1}) scaleY(${img.flipY ? -1 : 1})`,
              opacity: img.opacity ?? 1,
              zIndex: img.zIndex ?? 8,
            }}
          >
            <img
              src={img.dataUrl}
              alt="Вставлене зображення"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Resize Handles (8 handles) */}
            {isSelected && (
              <>
                {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => {
                  let handleStyle: React.CSSProperties = {};
                  if (h === 'nw') handleStyle = { top: -4, left: -4, cursor: 'nwse-resize' };
                  if (h === 'n') handleStyle = { top: -4, left: '50%', marginLeft: -4, cursor: 'ns-resize' };
                  if (h === 'ne') handleStyle = { top: -4, right: -4, cursor: 'nesw-resize' };
                  if (h === 'e') handleStyle = { top: '50%', right: -4, marginTop: -4, cursor: 'ew-resize' };
                  if (h === 'se') handleStyle = { bottom: -4, right: -4, cursor: 'nwse-resize' };
                  if (h === 's') handleStyle = { bottom: -4, left: '50%', marginLeft: -4, cursor: 'ns-resize' };
                  if (h === 'sw') handleStyle = { bottom: -4, left: -4, cursor: 'nesw-resize' };
                  if (h === 'w') handleStyle = { top: '50%', left: -4, marginTop: -4, cursor: 'ew-resize' };

                  return (
                    <div
                      key={h}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const ptX = (e.clientX - rect.left) / scale;
                        const ptY = (e.clientY - rect.top) / scale;
                        setResizeHandle({
                          id: img.id,
                          handle: h,
                          startX: ptX,
                          startY: ptY,
                          origX: img.x,
                          origY: img.y,
                          origW: img.width,
                          origH: img.height,
                        });
                      }}
                      className="resize-handle absolute w-2.5 h-2.5 bg-blue-600 border border-white rounded-sm shadow-sm z-30"
                      style={handleStyle}
                    />
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      {/* 5. STAMPS */}
      {stamps.map((stamp) => {
        const isSelected = selectedStampId === stamp.id;
        return (
          <div
            key={stamp.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectStamp?.(stamp);
            }}
            onPointerDown={(e) => {
              if (toolMode === 'select') {
                e.stopPropagation();
                onSelectStamp?.(stamp);
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const ptX = (e.clientX - rect.left) / scale;
                const ptY = (e.clientY - rect.top) / scale;
                setDragItem({
                  type: 'stamp',
                  id: stamp.id,
                  startX: ptX,
                  startY: ptY,
                  origX: stamp.x,
                  origY: stamp.y,
                });
              }
            }}
            className={`absolute flex flex-col items-center justify-center p-2 rounded-lg border-2 shadow-sm font-bold select-none cursor-move transition-shadow ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg' : 'hover:ring-1 hover:ring-blue-400'
            }`}
            style={{
              left: stamp.x * scale,
              top: stamp.y * scale,
              width: stamp.width * scale,
              height: stamp.height * scale,
              borderColor: stamp.color,
              color: stamp.color,
              transform: `rotate(${stamp.rotation || -4}deg)`,
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              zIndex: stamp.zIndex ?? 15,
            }}
          >
            <div
              className="w-full h-full border border-dashed rounded flex flex-col items-center justify-center p-1"
              style={{ borderColor: stamp.color }}
            >
              <span
                className="font-black tracking-wider uppercase leading-none"
                style={{ fontSize: `${Math.max(10, stamp.height * scale * 0.28)}px` }}
              >
                {stamp.text}
              </span>
              {stamp.subtitle && (
                <span
                  className="font-bold tracking-tight opacity-90 mt-0.5 leading-none"
                  style={{ fontSize: `${Math.max(7, stamp.height * scale * 0.16)}px` }}
                >
                  {stamp.subtitle}
                </span>
              )}
              {stamp.date && (
                <span
                  className="font-mono opacity-80 mt-0.5 leading-none"
                  style={{ fontSize: `${Math.max(7, stamp.height * scale * 0.14)}px` }}
                >
                  {stamp.date}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* 6. SIGNATURES */}
      {signatures.map((sig) => {
        const isSelected = selectedSignatureId === sig.id;
        return (
          <div
            key={sig.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSignature?.(sig);
            }}
            onPointerDown={(e) => {
              if (toolMode === 'select') {
                e.stopPropagation();
                onSelectSignature?.(sig);
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const ptX = (e.clientX - rect.left) / scale;
                const ptY = (e.clientY - rect.top) / scale;
                setDragItem({
                  type: 'signature',
                  id: sig.id,
                  startX: ptX,
                  startY: ptY,
                  origX: sig.x,
                  origY: sig.y,
                });
              }
            }}
            className={`absolute cursor-move select-none transition-shadow ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : 'hover:ring-1 hover:ring-blue-400'
            }`}
            style={{
              left: sig.x * scale,
              top: sig.y * scale,
              width: sig.width * scale,
              height: sig.height * scale,
              opacity: sig.opacity ?? 1,
              zIndex: sig.zIndex ?? 15,
            }}
          >
            <img
              src={sig.dataUrl}
              alt="Підпис"
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        );
      })}
    </div>
  );
};
