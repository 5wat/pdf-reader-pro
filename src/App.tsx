import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
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
  DocumentState,
} from './types/pdf';
import {
  loadPdfDocument,
  getPagesInfo,
  extractPageTextBlocks,
} from './services/pdfRenderer';
import {
  saveModifiedPdf,
  downloadPdfBlob,
  printPdfBlob,
  createNewBlankPdf,
  mergePdfs,
} from './services/pdfModifier';
import { useHistory } from './hooks/useHistory';
import { FileUp, FilePlus } from 'lucide-react';

import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { PropertiesBar } from './components/PropertiesBar';
import { PageSidebar } from './components/PageSidebar';
import { PdfViewer } from './components/PdfViewer';
import { SignatureModal } from './components/SignatureModal';
import { StampModal } from './components/StampModal';
import { MergeModal } from './components/MergeModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { OnboardingTour } from './components/OnboardingTour';
import { AdminPanel } from './components/AdminPanel';
import {
  initAnalytics,
  trackToolUse,
  trackDocumentLoad,
  trackDocumentExport,
  trackDocumentPrint,
  trackMergePdf,
  trackThemeChange,
} from './services/analyticsTracker';

export const App: React.FC = () => {
  // Theme state: dark (default), light
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('propdf_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('propdf_theme', theme);
  }, [theme]);

  // Document Core State
  const [rawPdfBytes, setRawPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [fileName, setFileName] = useState<string>('Документ.pdf');
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.25);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Tools & Edit Modes
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [activeShapeType, setActiveShapeType] = useState<ShapeType>('rectangle');
  const [penColor, setPenColor] = useState<string>('#000000');
  const [penWidth, setPenWidth] = useState<number>(2);
  const [highlighterColor, setHighlighterColor] = useState<string>('#FEF08A');
  const [highlighterWidth, setHighlighterWidth] = useState<number>(14);

  // Content layers
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [drawings, setDrawings] = useState<DrawingElement[]>([]);
  const [shapes, setShapes] = useState<ShapeElement[]>([]);
  const [whiteouts, setWhiteouts] = useState<WhiteoutElement[]>([]);
  const [stamps, setStamps] = useState<StampElement[]>([]);
  const [signatures, setSignatures] = useState<SignatureElement[]>([]);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [deletedPages, setDeletedPages] = useState<number[]>([]);

  // Selection
  const [selectedText, setSelectedText] = useState<TextBlock | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageElement | null>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeElement | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<StampElement | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<SignatureElement | null>(null);
  const [selectedWhiteout, setSelectedWhiteout] = useState<WhiteoutElement | null>(null);

  // Modals
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [isStampModalOpen, setIsStampModalOpen] = useState<boolean>(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // File Inputs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // History Manager
  const history = useHistory({
    textBlocks: [],
    images: [],
    drawings: [],
    shapes: [],
    whiteouts: [],
    stamps: [],
    signatures: [],
    pageOrder: [],
    pageRotations: {},
    deletedPages: [],
  });

  const recordHistory = useCallback(
    (customState?: Partial<DocumentState>) => {
      history.pushState({
        textBlocks: customState?.textBlocks ?? textBlocks,
        images: customState?.images ?? images,
        drawings: customState?.drawings ?? drawings,
        shapes: customState?.shapes ?? shapes,
        whiteouts: customState?.whiteouts ?? whiteouts,
        stamps: customState?.stamps ?? stamps,
        signatures: customState?.signatures ?? signatures,
        pageOrder: customState?.pageOrder ?? pageOrder,
        pageRotations: customState?.pageRotations ?? pageRotations,
        deletedPages: customState?.deletedPages ?? deletedPages,
      });
    },
    [
      history,
      textBlocks,
      images,
      drawings,
      shapes,
      whiteouts,
      stamps,
      signatures,
      pageOrder,
      pageRotations,
      deletedPages,
    ]
  );

  // Check if URL matches secret admin entry (/#admin or ?admin=portal)
  const isSecretAdminUrl = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const isHash = window.location.hash.toLowerCase() === '#admin';
    const params = new URLSearchParams(window.location.search);
    const isParam = params.get('admin') === 'portal' || params.get('admin') === '1';
    return isHash || isParam;
  }, []);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(() => isSecretAdminUrl());

  // Listen for hashchange and popstate to trigger admin panel on secret URL
  useEffect(() => {
    initAnalytics();

    const handleUrlChange = () => {
      if (isSecretAdminUrl()) {
        setIsAdminPanelOpen(true);
      }
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [isSecretAdminUrl]);

  const handleCloseAdmin = () => {
    setIsAdminPanelOpen(false);
    // Erase #admin and ?admin=portal silently without reloading page
    if (isSecretAdminUrl()) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    trackThemeChange(newTheme);
  };

  // 1. Initial startup: open onboarding if not completed yet
  useEffect(() => {
    const hasCompleted = localStorage.getItem('propdf_onboarding_completed');
    if (!hasCompleted) {
      setIsOnboardingOpen(true);
    }
  }, []);

  // Tool change: clear active item selections when switching away from 'select'
  const handleSelectTool = (newTool: ToolMode) => {
    setToolMode(newTool);
    trackToolUse(newTool);
    if (newTool !== 'select') {
      setSelectedText(null);
      setSelectedImage(null);
      setSelectedShape(null);
      setSelectedStamp(null);
      setSelectedSignature(null);
      setSelectedWhiteout(null);
    }
  };

  // Drag and Drop PDF files onto the window
  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const bytes = new Uint8Array(ev.target.result as ArrayBuffer);
          loadDocumentFromBytes(bytes, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const loadDocumentFromBytes = async (bytes: Uint8Array, name: string) => {
    try {
      const bytesClone = new Uint8Array(bytes.slice());
      setRawPdfBytes(bytesClone);

      const doc = await loadPdfDocument(bytesClone);
      const pagesInfo = await getPagesInfo(doc);

      setPdfDocProxy(doc);
      setFileName(name);
      setPages(pagesInfo);
      setCurrentPageIndex(0);

      const initialOrder = pagesInfo.map((p) => p.pageIndex);
      setPageOrder(initialOrder);
      setPageRotations({});
      setDeletedPages([]);

      // Extract text blocks from all pages
      const allTextBlocks: TextBlock[] = [];
      for (let i = 0; i < pagesInfo.length; i++) {
        const blocks = await extractPageTextBlocks(doc, i);
        allTextBlocks.push(...blocks);
      }

      setTextBlocks(allTextBlocks);
      trackDocumentLoad(pagesInfo.length, name);
      setImages([]);
      setDrawings([]);
      setShapes([]);
      setWhiteouts([]);
      setStamps([]);
      setSignatures([]);
      setSelectedText(null);
      setSelectedImage(null);
      setSelectedShape(null);
      setSelectedStamp(null);
      setSelectedSignature(null);
      setSelectedWhiteout(null);

      history.resetHistory({
        textBlocks: allTextBlocks,
        images: [],
        drawings: [],
        shapes: [],
        whiteouts: [],
        stamps: [],
        signatures: [],
        pageOrder: initialOrder,
        pageRotations: {},
        deletedPages: [],
      });
    } catch (err) {
      console.error('Error loading PDF document:', err);
      alert('Помилка при завантаженні PDF файлу.');
    }
  };

  // Open file handler
  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const bytes = new Uint8Array(ev.target.result as ArrayBuffer);
        loadDocumentFromBytes(bytes, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // New Blank Document
  const handleNewFile = async () => {
    if (pages.length === 0 || confirm('Створити новий чистий PDF документ? Незбережені зміни буде втрачено.')) {
      const bytes = await createNewBlankPdf();
      loadDocumentFromBytes(bytes, 'Новий_документ.pdf');
    }
  };

  // Merge Document (Preserves all current edits and added elements before merging)
  const handleMergeFile = async (otherPdfBytes: Uint8Array) => {
    if (!rawPdfBytes) return;
    try {
      const currentState: DocumentState = {
        title: fileName,
        fileName,
        totalPages: pages.length,
        currentPage: currentPageIndex,
        pages,
        textBlocks,
        images,
        drawings,
        shapes,
        whiteouts,
        stamps,
        signatures,
        pageOrder,
        pageRotations,
        deletedPages,
      };
      const currentSavedBytes = await saveModifiedPdf(rawPdfBytes, currentState);
      const mergedBytes = await mergePdfs(currentSavedBytes, otherPdfBytes);
      loadDocumentFromBytes(mergedBytes, fileName);
      trackMergePdf();
    } catch (err) {
      console.error('Failed to merge PDFs:', err);
      alert('Не вдалося об\'єднати PDF документи: ' + (err as Error).message);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    const prev = history.undo();
    if (prev) {
      setTextBlocks(prev.textBlocks);
      setImages(prev.images);
      setDrawings(prev.drawings);
      setShapes(prev.shapes);
      setWhiteouts(prev.whiteouts);
      setStamps(prev.stamps);
      setSignatures(prev.signatures);
      setPageOrder(prev.pageOrder);
      setPageRotations(prev.pageRotations);
      setDeletedPages(prev.deletedPages);
    }
  };

  const handleRedo = () => {
    const next = history.redo();
    if (next) {
      setTextBlocks(next.textBlocks);
      setImages(next.images);
      setDrawings(next.drawings);
      setShapes(next.shapes);
      setWhiteouts(next.whiteouts);
      setStamps(next.stamps);
      setSignatures(next.signatures);
      setPageOrder(next.pageOrder);
      setPageRotations(next.pageRotations);
      setDeletedPages(next.deletedPages);
    }
  };

  // Save / Export PDF
  const handleSavePdf = async () => {
    setIsSaving(true);
    try {
      const currentState: DocumentState = {
        title: fileName,
        fileName,
        totalPages: pages.length,
        currentPage: currentPageIndex,
        pages,
        textBlocks,
        images,
        drawings,
        shapes,
        whiteouts,
        stamps,
        signatures,
        pageOrder,
        pageRotations,
        deletedPages,
      };

      const modifiedBytes = await saveModifiedPdf(rawPdfBytes, currentState);
      downloadPdfBlob(modifiedBytes, fileName);
      trackDocumentExport(pages.length, fileName);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Помилка при експорті PDF: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Print PDF
  const handlePrint = async () => {
    try {
      const currentState: DocumentState = {
        title: fileName,
        fileName,
        totalPages: pages.length,
        currentPage: currentPageIndex,
        pages,
        textBlocks,
        images,
        drawings,
        shapes,
        whiteouts,
        stamps,
        signatures,
        pageOrder,
        pageRotations,
        deletedPages,
      };
      const modifiedBytes = await saveModifiedPdf(rawPdfBytes, currentState);
      printPdfBlob(modifiedBytes);
      trackDocumentPrint();
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  // Insert image file
  const handleImageFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        insertImageOnCurrentPage(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertImageOnCurrentPage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 240;
      const aspect = img.naturalWidth / img.naturalHeight;
      const w = Math.min(maxW, img.naturalWidth);
      const h = w / aspect;

      const newImg: ImageElement = {
        id: `img-${Date.now()}`,
        pageIndex: currentPageIndex,
        x: 100,
        y: 150,
        width: Math.round(w),
        height: Math.round(h),
        rotation: 0,
        opacity: 1,
        dataUrl,
        aspectRatio: aspect,
        zIndex: images.length + 1,
      };

      const updated = [...images, newImg];
      setImages(updated);
      setSelectedImage(newImg);
      recordHistory({ images: updated });
    };
    img.src = dataUrl;
  };

  // Global Clipboard listener for Cmd+V paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                insertImageOnCurrentPage(ev.target.result as string);
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [currentPageIndex, images]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).closest('input, textarea');
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Cmd+Z
      if (cmdKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Cmd+Shift+Z or Cmd+Y
      if ((cmdKey && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdKey && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Save: Cmd+S
      if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSavePdf();
        return;
      }

      // Print: Cmd+P
      if (cmdKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
        return;
      }

      // Zoom In: Cmd +
      if (cmdKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setScale((prev) => Math.min(3, prev + 0.15));
        return;
      }

      // Zoom Out: Cmd -
      if (cmdKey && e.key === '-') {
        e.preventDefault();
        setScale((prev) => Math.max(0.4, prev - 0.15));
        return;
      }

      // Zoom Reset: Cmd 0
      if (cmdKey && e.key === '0') {
        e.preventDefault();
        setScale(1.0);
        return;
      }

      if (isInput) return;

      // Delete key for selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedText) {
          e.preventDefault();
          handleDeleteText(selectedText.id);
        } else if (selectedImage) {
          e.preventDefault();
          handleDeleteImage(selectedImage.id);
        } else if (selectedShape) {
          e.preventDefault();
          handleDeleteShape(selectedShape.id);
        } else if (selectedStamp) {
          e.preventDefault();
          handleDeleteStamp(selectedStamp.id);
        } else if (selectedSignature) {
          e.preventDefault();
          handleDeleteSignature(selectedSignature.id);
        } else if (selectedWhiteout) {
          e.preventDefault();
          handleDeleteWhiteout(selectedWhiteout.id);
        }
        return;
      }

      // Esc to clear selections
      if (e.key === 'Escape') {
        setSelectedText(null);
        setSelectedImage(null);
        setSelectedShape(null);
        setSelectedStamp(null);
        setSelectedSignature(null);
        setSelectedWhiteout(null);
        setToolMode('select');
        return;
      }

      // Tool shortcuts
      if (e.key.toLowerCase() === 'v') setToolMode('select');
      if (e.key.toLowerCase() === 'e') setToolMode('editText');
      if (e.key.toLowerCase() === 't') setToolMode('addText');
      if (e.key.toLowerCase() === 'i') imageInputRef.current?.click();
      if (e.key.toLowerCase() === 'p') setToolMode('pen');
      if (e.key.toLowerCase() === 'h') setToolMode('highlighter');
      if (e.key.toLowerCase() === 'u') setToolMode('shape');
      if (e.key.toLowerCase() === 'w') setToolMode('whiteout');
      if (e.key.toLowerCase() === 's' && !cmdKey) setIsSignatureModalOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedText,
    selectedImage,
    selectedShape,
    selectedStamp,
    selectedSignature,
    selectedWhiteout,
    history,
    fileName,
    rawPdfBytes,
    textBlocks,
    images,
  ]);

  // Page operations
  const handleRotatePage = (pageIdx: number) => {
    setPageRotations((prev) => {
      const current = prev[pageIdx] || 0;
      const updated = { ...prev, [pageIdx]: (current + 90) % 360 };
      recordHistory({ pageRotations: updated });
      return updated;
    });
  };

  const handleDuplicatePage = (pageIdx: number) => {
    const curPos = pageOrder.indexOf(pageIdx);
    const updatedOrder = [...pageOrder];
    updatedOrder.splice(curPos + 1, 0, pageIdx);
    setPageOrder(updatedOrder);
    recordHistory({ pageOrder: updatedOrder });
  };

  const handleDeletePage = (pageIdx: number) => {
    const visibleCount = pageOrder.filter((idx) => !deletedPages.includes(idx)).length;
    if (visibleCount <= 1) {
      alert('Неможливо видалити останню сторінку документа.');
      return;
    }
    const updatedDeleted = [...deletedPages, pageIdx];
    setDeletedPages(updatedDeleted);
    recordHistory({ deletedPages: updatedDeleted });

    // Switch to adjacent page
    const remaining = pageOrder.filter((idx) => !updatedDeleted.includes(idx));
    if (remaining.length > 0) {
      setCurrentPageIndex(remaining[0]);
    }
  };

  const handleMovePage = (fromPos: number, toPos: number) => {
    const updated = [...pageOrder];
    const [moved] = updated.splice(fromPos, 1);
    updated.splice(toPos, 0, moved);
    setPageOrder(updated);
    recordHistory({ pageOrder: updated });
  };

  const handleAddBlankPage = () => {
    const newIdx = pages.length;
    const newPageInfo: PageInfo = {
      pageIndex: newIdx,
      pageNumber: newIdx + 1,
      width: 595.28,
      height: 841.89,
      rotation: 0,
    };
    setPages((prev) => [...prev, newPageInfo]);
    const updatedOrder = [...pageOrder, newIdx];
    setPageOrder(updatedOrder);
    setCurrentPageIndex(newIdx);
    recordHistory({ pageOrder: updatedOrder });
  };

  // Text Handlers
  const handleUpdateTextBlock = (id: string, updates: Partial<TextBlock>) => {
    setTextBlocks((prev) =>
      prev.map((tb) => (tb.id === id ? { ...tb, ...updates } : tb))
    );
    if (selectedText?.id === id) {
      setSelectedText((prev) => (prev ? { ...prev, ...updates } : null));
    }
    recordHistory();
  };

  const handleBatchUpdateTextBlocks = useCallback(
    (updatesMap: Record<string, Partial<TextBlock>>, shouldRecord: boolean = false) => {
      setTextBlocks((prev) =>
        prev.map((tb) => (updatesMap[tb.id] ? { ...tb, ...updatesMap[tb.id] } : tb))
      );
      setSelectedText((prev) => (prev && updatesMap[prev.id] ? { ...prev, ...updatesMap[prev.id] } : prev));
      if (shouldRecord) {
        recordHistory();
      }
    },
    [recordHistory]
  );

  const handleSelectTextBlock = (block: TextBlock | null) => {
    setSelectedText(block);
    if (block) {
      setSelectedImage(null);
      setSelectedShape(null);
      setSelectedWhiteout(null);
      setSelectedStamp(null);
      setSelectedSignature(null);
    }
  };

  const handleAddTextBlock = (block: TextBlock) => {
    setTextBlocks((prev) => [...prev, block]);
    handleSelectTextBlock(block);
    recordHistory({ textBlocks: [...textBlocks, block] });
  };

  const handleDeleteText = (id: string) => {
    setTextBlocks((prev) =>
      prev.map((tb) => (tb.id === id ? { ...tb, isDeleted: true } : tb))
    );
    setSelectedText(null);
    recordHistory();
  };

  // Image Handlers
  const handleSelectImage = (img: ImageElement | null) => {
    setSelectedImage(img);
    if (img) {
      setSelectedText(null);
      setSelectedShape(null);
      setSelectedWhiteout(null);
      setSelectedStamp(null);
      setSelectedSignature(null);
    }
  };

  const handleUpdateImage = (id: string, updates: Partial<ImageElement>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    );
    if (selectedImage?.id === id) {
      setSelectedImage((prev) => (prev ? { ...prev, ...updates } : null));
    }
    recordHistory();
  };

  const handleDeleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSelectedImage(null);
    recordHistory();
  };

  // Shape Handlers
  const handleSelectShape = (shape: ShapeElement | null) => {
    setSelectedShape(shape);
    if (shape) {
      setSelectedText(null);
      setSelectedImage(null);
      setSelectedWhiteout(null);
      setSelectedStamp(null);
      setSelectedSignature(null);
    }
  };

  const handleAddShape = (shape: ShapeElement) => {
    setShapes((prev) => [...prev, shape]);
    handleSelectShape(shape);
    recordHistory({ shapes: [...shapes, shape] });
  };

  const handleUpdateShapeById = (id: string, updates: Partial<ShapeElement>) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (selectedShape?.id === id) {
      setSelectedShape((prev) => (prev ? { ...prev, ...updates } : null));
    }
    recordHistory();
  };

  const handleUpdateShape = (updates: Partial<ShapeElement>) => {
    if (!selectedShape) return;
    handleUpdateShapeById(selectedShape.id, updates);
  };

  const handleDeleteShape = (id: string) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    setSelectedShape(null);
    recordHistory();
  };

  // Drawing Handlers
  const handleAddDrawing = (drawing: DrawingElement) => {
    setDrawings((prev) => [...prev, drawing]);
    recordHistory({ drawings: [...drawings, drawing] });
  };

  // Whiteout Handlers
  const handleSelectWhiteout = (w: WhiteoutElement | null) => {
    setSelectedWhiteout(w);
    if (w) {
      setSelectedText(null);
      setSelectedImage(null);
      setSelectedShape(null);
      setSelectedStamp(null);
      setSelectedSignature(null);
    }
  };

  const handleAddWhiteout = (w: WhiteoutElement) => {
    setWhiteouts((prev) => [...prev, w]);
    handleSelectWhiteout(w);
    recordHistory({ whiteouts: [...whiteouts, w] });
  };

  const handleUpdateWhiteoutById = (id: string, updates: Partial<WhiteoutElement>) => {
    setWhiteouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
    if (selectedWhiteout?.id === id) {
      setSelectedWhiteout((prev) => (prev ? { ...prev, ...updates } : null));
    }
    recordHistory();
  };

  const handleDeleteWhiteout = (id: string) => {
    setWhiteouts((prev) => prev.filter((w) => w.id !== id));
    setSelectedWhiteout(null);
    recordHistory();
  };

  // Stamp Handlers
  const handleSelectStamp = (stamp: StampElement | null) => {
    setSelectedStamp(stamp);
    if (stamp) {
      setSelectedText(null);
      setSelectedImage(null);
      setSelectedShape(null);
      setSelectedWhiteout(null);
      setSelectedSignature(null);
    }
  };

  const handleApplyStamp = (stampData: {
    text: string;
    subtitle?: string;
    date?: string;
    color: string;
  }) => {
    const newStamp: StampElement = {
      id: `stamp-${Date.now()}`,
      pageIndex: currentPageIndex,
      x: 160,
      y: 280,
      width: 170,
      height: 70,
      rotation: -4,
      text: stampData.text,
      subtitle: stampData.subtitle,
      date: stampData.date,
      color: stampData.color,
    };
    setStamps((prev) => [...prev, newStamp]);
    handleSelectStamp(newStamp);
    recordHistory({ stamps: [...stamps, newStamp] });
  };

  const handleUpdateStampById = (id: string, updates: Partial<StampElement>) => {
    setStamps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (selectedStamp?.id === id) {
      setSelectedStamp((prev) => (prev ? { ...prev, ...updates } : null));
    }
    recordHistory();
  };

  const handleDeleteStamp = (id: string) => {
    setStamps((prev) => prev.filter((s) => s.id !== id));
    setSelectedStamp(null);
    recordHistory();
  };

  // Signature Handlers
  const handleSelectSignature = (sig: SignatureElement | null) => {
    setSelectedSignature(sig);
    if (sig) {
      setSelectedText(null);
      setSelectedImage(null);
      setSelectedShape(null);
      setSelectedWhiteout(null);
      setSelectedStamp(null);
    }
  };

  const handleApplySignature = (dataUrl: string) => {
    const newSig: SignatureElement = {
      id: `sig-${Date.now()}`,
      pageIndex: currentPageIndex,
      x: 180,
      y: 540,
      width: 150,
      height: 60,
      dataUrl,
      opacity: 1,
    };
    setSignatures((prev) => [...prev, newSig]);
    handleSelectSignature(newSig);
    recordHistory({ signatures: [...signatures, newSig] });
  };

  const handleUpdateSignatureById = (id: string, updates: Partial<SignatureElement>) => {
    setSignatures((prev) =>
      prev.map((sig) => (sig.id === id ? { ...sig, ...updates } : sig))
    );
    if (selectedSignature?.id === id) {
      setSelectedSignature((prev) => (prev ? { ...prev, ...updates } : null));
    }
    recordHistory();
  };

  const handleDeleteSignature = (id: string) => {
    setSignatures((prev) => prev.filter((sig) => sig.id !== id));
    setSelectedSignature(null);
    recordHistory();
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Hidden file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleOpenFile}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFilePicked}
        className="hidden"
      />

      {/* Top Header */}
      <Header
        fileName={fileName}
        onFileNameChange={setFileName}
        onOpenFile={() => fileInputRef.current?.click()}
        onNewFile={handleNewFile}
        onMergeFile={() => setIsMergeModalOpen(true)}
        onSavePdf={handleSavePdf}
        onPrint={handlePrint}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        scale={scale}
        onZoomIn={() => setScale((prev) => Math.min(3, prev + 0.15))}
        onZoomOut={() => setScale((prev) => Math.max(0.4, prev - 0.15))}
        onResetZoom={() => setScale(1.0)}
        onFitWidth={() => setScale(1.4)}
        theme={theme}
        onThemeChange={handleThemeChange}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onToggleOnboarding={() => setIsOnboardingOpen((prev) => !prev)}
        isOnboardingActive={isOnboardingOpen}
        isSaving={isSaving}
      />

      {/* Primary Toolbar */}
      <Toolbar
        activeTool={toolMode}
        onSelectTool={handleSelectTool}
        onAddImageClick={() => imageInputRef.current?.click()}
        onAddStampClick={() => setIsStampModalOpen(true)}
        onAddSignatureClick={() => setIsSignatureModalOpen(true)}
      />

      {/* Contextual Properties Inspector */}
      <PropertiesBar
        activeTool={toolMode}
        selectedText={selectedText}
        onUpdateText={(upd) => selectedText && handleUpdateTextBlock(selectedText.id, upd)}
        onDeleteText={handleDeleteText}
        selectedImage={selectedImage}
        onUpdateImage={(upd) => selectedImage && handleUpdateImage(selectedImage.id, upd)}
        onDeleteImage={handleDeleteImage}
        selectedShape={selectedShape}
        onUpdateShape={handleUpdateShape}
        onDeleteShape={handleDeleteShape}
        selectedStamp={selectedStamp}
        onUpdateStamp={(upd) => selectedStamp && handleUpdateStampById(selectedStamp.id, upd)}
        onDeleteStamp={handleDeleteStamp}
        selectedSignature={selectedSignature}
        onUpdateSignature={(upd) => selectedSignature && handleUpdateSignatureById(selectedSignature.id, upd)}
        onDeleteSignature={handleDeleteSignature}
        selectedWhiteout={selectedWhiteout}
        onUpdateWhiteout={(upd) => selectedWhiteout && handleUpdateWhiteoutById(selectedWhiteout.id, upd)}
        onDeleteWhiteout={handleDeleteWhiteout}
        penColor={penColor}
        onPenColorChange={setPenColor}
        penWidth={penWidth}
        onPenWidthChange={setPenWidth}
        highlighterColor={highlighterColor}
        onHighlighterColorChange={setHighlighterColor}
        highlighterWidth={highlighterWidth}
        onHighlighterWidthChange={setHighlighterWidth}
        activeShapeType={activeShapeType}
        onShapeTypeChange={setActiveShapeType}
      />

      {/* Main Workspace: Sidebar + PDF Viewer / Dropzone */}
      <div className="flex-1 flex overflow-hidden relative">
        <PageSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          pdfDoc={pdfDocProxy}
          pages={pages}
          pageOrder={pageOrder}
          deletedPages={deletedPages}
          pageRotations={pageRotations}
          currentPageIndex={currentPageIndex}
          onSelectPage={setCurrentPageIndex}
          onRotatePage={handleRotatePage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onMovePage={handleMovePage}
          onAddBlankPage={handleNewFile}
        />

        {pages.length > 0 ? (
          <PdfViewer
            pdfDoc={pdfDocProxy}
            currentPageIndex={currentPageIndex}
            onPageChange={setCurrentPageIndex}
            pages={pages}
            pageOrder={pageOrder}
            deletedPages={deletedPages}
            pageRotations={pageRotations}
            scale={scale}
            toolMode={toolMode}
            textBlocks={textBlocks}
            onUpdateTextBlock={handleUpdateTextBlock}
            onBatchUpdateTextBlocks={handleBatchUpdateTextBlocks}
            onAddTextBlock={handleAddTextBlock}
            onSelectTextBlock={handleSelectTextBlock}
            selectedTextId={selectedText?.id ?? null}
            images={images}
            onUpdateImage={handleUpdateImage}
            onSelectImage={handleSelectImage}
            selectedImageId={selectedImage?.id ?? null}
            shapes={shapes}
            onAddShape={handleAddShape}
            onUpdateShape={handleUpdateShapeById}
            onSelectShape={handleSelectShape}
            selectedShapeId={selectedShape?.id ?? null}
            drawings={drawings}
            onAddDrawing={handleAddDrawing}
            whiteouts={whiteouts}
            onAddWhiteout={handleAddWhiteout}
            onUpdateWhiteout={handleUpdateWhiteoutById}
            onSelectWhiteout={handleSelectWhiteout}
            selectedWhiteoutId={selectedWhiteout?.id ?? null}
            stamps={stamps}
            onUpdateStamp={handleUpdateStampById}
            onSelectStamp={handleSelectStamp}
            selectedStampId={selectedStamp?.id ?? null}
            signatures={signatures}
            onUpdateSignature={handleUpdateSignatureById}
            onSelectSignature={handleSelectSignature}
            selectedSignatureId={selectedSignature?.id ?? null}
            penColor={penColor}
            penWidth={penWidth}
            highlighterColor={highlighterColor}
            highlighterWidth={highlighterWidth}
            activeShapeType={activeShapeType}
          />
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDropFile}
            className={`flex-1 flex flex-col items-center justify-center p-8 transition-all ${
              isDragOver
                ? 'bg-blue-50/60 dark:bg-blue-950/40 border-2 border-dashed border-blue-500'
                : 'bg-slate-100 dark:bg-slate-950'
            }`}
          >
            <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
                <FileUp className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                Відкрийте або створіть PDF
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Перетягніть PDF файл сюди або скористайтеся кнопками нижче для початку роботи.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Відкрити PDF</span>
                </button>
                <button
                  onClick={handleNewFile}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Чистий аркуш A4</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onApplySignature={handleApplySignature}
      />

      <StampModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        onApplyStamp={handleApplyStamp}
      />

      <MergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        onMerge={handleMergeFile}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <OnboardingTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={handleCloseAdmin}
      />
    </div>
  );
};

export default App;
