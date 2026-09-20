import { useState, useCallback, useRef } from 'react';
import { HistorySnapshot } from '../types/pdf';

export function useHistory(initialState: HistorySnapshot) {
  const [history, setHistory] = useState<HistorySnapshot[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  const pushState = useCallback((newState: HistorySnapshot) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, currentIndex + 1);
      // Limit history to 50 steps
      const updated = [...upToCurrent, newState];
      if (updated.length > 50) {
        updated.shift();
      }
      return updated;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, 49));
  }, [currentIndex]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const undo = useCallback((): HistorySnapshot | null => {
    if (!canUndo) return null;
    isUndoRedoAction.current = true;
    const newIdx = currentIndex - 1;
    setCurrentIndex(newIdx);
    return history[newIdx];
  }, [canUndo, currentIndex, history]);

  const redo = useCallback((): HistorySnapshot | null => {
    if (!canRedo) return null;
    isUndoRedoAction.current = true;
    const newIdx = currentIndex + 1;
    setCurrentIndex(newIdx);
    return history[newIdx];
  }, [canRedo, currentIndex, history]);

  const resetHistory = useCallback((state: HistorySnapshot) => {
    setHistory([state]);
    setCurrentIndex(0);
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    currentState: history[currentIndex],
  };
}
