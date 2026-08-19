import { useEffect, useRef } from 'react';
import { ViolationType } from '../types';

interface UseMalpracticeLockdownProps {
  isActive: boolean;
  onViolation: (type: ViolationType, reason: string) => void;
}

export const useMalpracticeLockdown = ({
  isActive,
  onViolation
}: UseMalpracticeLockdownProps) => {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  const lastViolationTimeRef = useRef<Record<string, number>>({});

  // Debounced violation trigger helper to avoid duplicate triggers from linked events (e.g. blur + visibilitychange)
  const triggerDebouncedViolation = (type: ViolationType, reason: string, debounceMs = 1500) => {
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[type] || 0;
    if (now - lastTime > debounceMs) {
      lastViolationTimeRef.current[type] = now;
      onViolationRef.current(type, reason);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    // 1. Tab switch / Browser minimization
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerDebouncedViolation('TAB_SWITCH', 'Switched away from test tab or minimized browser');
      }
    };

    // 2. Window Blur (Alt+Tab, 3-finger app switch, 4-finger desktop switch, clicking external screen)
    const handleWindowBlur = () => {
      // Small timeout to confirm blur isn't inside same window
      setTimeout(() => {
        if (!document.hasFocus()) {
          triggerDebouncedViolation('WINDOW_BLUR', 'Window lost focus (Alt+Tab, trackpad app switch, or external click)');
        }
      }, 50);
    };

    // 3. Trackpad & Touch Gestures (3-finger / 4-finger swipes & pinch-to-zoom)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 3) {
        e.preventDefault();
        triggerDebouncedViolation('APP_SWITCH_GESTURE', 'Trackpad / Multi-finger gesture detected');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    // 4. Ctrl + Wheel Zoom Interception
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // 5. Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerDebouncedViolation('CONTEXT_MENU_BLOCKED', 'Right-click context menu is disabled during the exam', 2000);
    };

    // 6. Text Selection & Drag-and-Drop
    const handleSelectStart = (e: Event) => {
      // Allow selection inside normal text inputs if any, otherwise block
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // 7. Clipboard Actions
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerDebouncedViolation('SHORTCUT_BLOCKED', 'Copying test content is prohibited', 2000);
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerDebouncedViolation('SHORTCUT_BLOCKED', 'Cutting content is prohibited', 2000);
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerDebouncedViolation('SHORTCUT_BLOCKED', 'Pasting external content is prohibited', 2000);
    };

    // 8. Malpractice Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // F12 or F11
      if (e.key === 'F12' || e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        triggerDebouncedViolation('DEVTOOLS_OPEN', 'Developer tools shortcut attempt blocked', 2000);
        return;
      }

      // PrintScreen / Screenshot
      if (e.key === 'PrintScreen' || (e.shiftKey && isCtrl && key === 's')) {
        e.preventDefault();
        try {
          navigator.clipboard.writeText('');
        } catch {}
        triggerDebouncedViolation('SHORTCUT_BLOCKED', 'Screen capture shortcut blocked', 2000);
        return;
      }

      if (isCtrl) {
        // Copy / Paste / Cut / Select all
        if (key === 'c' || key === 'v' || key === 'x' || key === 'a') {
          e.preventDefault();
          e.stopPropagation();
          triggerDebouncedViolation('SHORTCUT_BLOCKED', `Keyboard shortcut Ctrl+${key.toUpperCase()} blocked`, 2000);
          return;
        }

        // Tab & Window controls: Ctrl+T, Ctrl+N, Ctrl+W, Ctrl+Shift+T/N
        if (key === 't' || key === 'n' || key === 'w') {
          e.preventDefault();
          e.stopPropagation();
          triggerDebouncedViolation('SHORTCUT_BLOCKED', `Navigation shortcut Ctrl+${key.toUpperCase()} blocked`, 2000);
          return;
        }

        // Print / Save / Find: Ctrl+P, Ctrl+S, Ctrl+F
        if (key === 'p' || key === 's' || key === 'f') {
          e.preventDefault();
          e.stopPropagation();
          triggerDebouncedViolation('SHORTCUT_BLOCKED', `Browser shortcut Ctrl+${key.toUpperCase()} blocked`, 2000);
          return;
        }

        // Inspect DevTools: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        if (e.shiftKey && (key === 'i' || key === 'j' || key === 'c') || key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          triggerDebouncedViolation('DEVTOOLS_OPEN', 'Inspect element shortcut blocked', 2000);
          return;
        }
      }
    };

    // 9. DevTools Size Delta Monitor
    const devToolsCheckInterval = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        triggerDebouncedViolation('DEVTOOLS_OPEN', 'DevTools window open detected', 4000);
      }
    }, 2000);

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('gesturestart', handleGesture);
    document.addEventListener('gesturechange', handleGesture);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearInterval(devToolsCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('gesturestart', handleGesture);
      document.removeEventListener('gesturechange', handleGesture);
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive]);
};
