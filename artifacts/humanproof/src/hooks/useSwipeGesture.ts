// useSwipeGesture.ts — P1 Mobile UX
//
// Touch swipe detection hook for tab navigation.
// Returns swipe direction callbacks for left/right gestures.
// Minimum threshold: 50px horizontal, max 30px vertical deviation.

import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

const MIN_SWIPE_DISTANCE = 50;
const MAX_VERTICAL_DEVIATION = 30;
const MAX_SWIPE_TIME = 500;

export function useSwipeGesture({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const touchRef = useRef<TouchState | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = touchRef.current;
    touchRef.current = null;

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const elapsed = Date.now() - startTime;

    if (elapsed > MAX_SWIPE_TIME) return;
    if (Math.abs(dy) > MAX_VERTICAL_DEVIATION) return;
    if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return;

    if (dx < 0) {
      onSwipeLeft?.();
    } else {
      onSwipeRight?.();
    }
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}
