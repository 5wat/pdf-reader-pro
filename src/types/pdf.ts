export type ToolMode =
  | 'select'
  | 'editText'
  | 'addText'
  | 'addImage'
  | 'pen'
  | 'highlighter'
  | 'shape'
  | 'whiteout'
  | 'stamp'
  | 'signature';

export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line';

export interface TextBlock {
  id: string;
  pageIndex: number;
  x: number; // in PDF points (72 DPI)
  y: number; // in PDF points from top-left
  width: number;
  height: number;
  text: string;
  originalText?: string;
  originalX?: number;
  originalY?: number;
  originalWidth?: number;
  originalHeight?: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  align?: 'left' | 'center' | 'right';
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
  zIndex?: number;
}

export interface ImageElement {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees (0, 90, 180, etc.)
  opacity: number; // 0 to 1
  dataUrl: string; // base64 image data
  aspectRatio: number;
  flipX?: boolean;
  flipY?: boolean;
  zIndex: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  pageIndex: number;
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  isHighlighter?: boolean;
  zIndex?: number;
}

export interface ShapeElement {
  id: string;
  pageIndex: number;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  zIndex?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface WhiteoutElement {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // usually #FFFFFF
  zIndex?: number;
}

export interface StampElement {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  subtitle?: string;
  date?: string;
  color: string;
  presetId?: string;
  zIndex?: number;
}

export interface SignatureElement {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  opacity: number;
  zIndex?: number;
}

export interface PageInfo {
  pageIndex: number;
  pageNumber: number;
  width: number; // in PDF points
  height: number; // in PDF points
  rotation: number; // 0, 90, 180, 270
}

export interface DocumentState {
  title: string;
  fileName: string;
  totalPages: number;
  currentPage: number;
  pages: PageInfo[];
  textBlocks: TextBlock[];
  images: ImageElement[];
  drawings: DrawingElement[];
  shapes: ShapeElement[];
  whiteouts: WhiteoutElement[];
  stamps: StampElement[];
  signatures: SignatureElement[];
  pageOrder: number[]; // order of page indexes
  pageRotations: Record<number, number>; // extra rotation applied
  deletedPages: number[];
}

export interface HistorySnapshot {
  textBlocks: TextBlock[];
  images: ImageElement[];
  drawings: DrawingElement[];
  shapes: ShapeElement[];
  whiteouts: WhiteoutElement[];
  stamps: StampElement[];
  signatures: SignatureElement[];
  pageOrder: number[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
}
