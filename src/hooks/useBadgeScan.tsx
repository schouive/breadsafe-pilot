import { useState, useEffect, useCallback, useRef } from 'react';

interface BadgeScanResult {
  badgeId: string;
  scanSpeedMs: number;
  timestamp: number;
}

interface UseBadgeScanOptions {
  enabled?: boolean;
  maxInputDelay?: number; // Max ms between keystrokes to consider scanner input
  minBadgeLength?: number;
  maxBadgeLength?: number;
  cooldownMs?: number; // Prevent duplicate scans
  onScan?: (result: BadgeScanResult) => void;
}

export function useBadgeScan({
  enabled = true,
  maxInputDelay = 50, // RFID readers type much faster than humans
  minBadgeLength = 4,
  maxBadgeLength = 20,
  cooldownMs = 30000, // 30 seconds anti-duplicate
  onScan,
}: UseBadgeScanOptions = {}) {
  const [lastScan, setLastScan] = useState<BadgeScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bufferRef = useRef('');
  const firstKeystrokeRef = useRef<number>(0);
  const lastKeystrokeRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    firstKeystrokeRef.current = 0;
    lastKeystrokeRef.current = 0;
    setIsScanning(false);
  }, []);

  const processBuffer = useCallback(() => {
    const badge = bufferRef.current.trim();
    const scanSpeed = lastKeystrokeRef.current - firstKeystrokeRef.current;
    const now = Date.now();

    // Validate badge length
    if (badge.length < minBadgeLength || badge.length > maxBadgeLength) {
      setError('Badge non reconnu');
      resetBuffer();
      return;
    }

    // Check scan speed - reject manual typing
    const avgKeystrokeDelay = scanSpeed / Math.max(badge.length - 1, 1);
    if (avgKeystrokeDelay > maxInputDelay) {
      setError('Saisie manuelle détectée — utilisez le lecteur RFID');
      resetBuffer();
      return;
    }

    // Anti-duplicate check
    if (now - lastScanTimeRef.current < cooldownMs) {
      setError('Scan trop rapide — veuillez patienter');
      resetBuffer();
      return;
    }

    const result: BadgeScanResult = {
      badgeId: badge,
      scanSpeedMs: scanSpeed,
      timestamp: now,
    };

    lastScanTimeRef.current = now;
    setLastScan(result);
    setError(null);
    onScan?.(result);
    resetBuffer();
  }, [minBadgeLength, maxBadgeLength, maxInputDelay, cooldownMs, onScan, resetBuffer]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is on an actual input/textarea (except our hidden scanner input)
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        if (!target.dataset.badgeScanner) return;
      }

      const now = Date.now();

      if (e.key === 'Enter') {
        e.preventDefault();
        if (bufferRef.current.length > 0) {
          processBuffer();
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      // Only accept printable characters
      if (e.key.length !== 1) return;

      if (bufferRef.current.length === 0) {
        firstKeystrokeRef.current = now;
        setIsScanning(true);
        setError(null);
      } else {
        // Check delay between keystrokes
        const delay = now - lastKeystrokeRef.current;
        if (delay > 200) {
          // Too slow, reset
          resetBuffer();
          firstKeystrokeRef.current = now;
          bufferRef.current = '';
          setIsScanning(true);
        }
      }

      lastKeystrokeRef.current = now;
      bufferRef.current += e.key;

      // Auto-process after timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (bufferRef.current.length > 0) {
          processBuffer();
        }
      }, 150);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, processBuffer, resetBuffer]);

  const clearError = useCallback(() => setError(null), []);
  const clearLastScan = useCallback(() => setLastScan(null), []);

  return {
    lastScan,
    isScanning,
    error,
    clearError,
    clearLastScan,
  };
}
