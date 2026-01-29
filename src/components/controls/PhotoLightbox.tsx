import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface PhotoLightboxProps {
  photos: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex, isOpen, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Zoom state
  const [scale, setScale] = useState(1);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const maxScale = 4;
  const minScale = 1;

  // Reset zoom when changing photos or closing
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setInitialPinchDistance(null);
  }, []);

  // Reset index and zoom when opening with a new initial index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetZoom();
    }
  }, [isOpen, initialIndex, resetZoom]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        if (scale > 1) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && scale === 1) {
        e.preventDefault();
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight' && scale === 1) {
        e.preventDefault();
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, photos.length, onClose, scale, resetZoom]);

  const goToPrevious = useCallback(() => {
    if (scale > 1) return;
    resetZoom();
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length, scale, resetZoom]);

  const goToNext = useCallback(() => {
    if (scale > 1) return;
    resetZoom();
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length, scale, resetZoom]);

  // Calculate distance between two touch points
  const getDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch handlers for swipe and pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = getDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialScale(scale);
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        // Pan start when zoomed
        setIsPanning(true);
        setLastPanPosition({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        });
      } else {
        // Swipe start
        setTouchEnd(null);
        setTouchStart(e.touches[0].clientX);
      }
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      // Pinch zoom
      e.preventDefault();
      const distance = getDistance(e.touches);
      const newScale = Math.min(maxScale, Math.max(minScale, initialScale * (distance / initialPinchDistance)));
      setScale(newScale);
      
      // Reset position if zooming out to 1
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1) {
      if (isPanning && scale > 1) {
        // Pan while zoomed
        e.preventDefault();
        const deltaX = e.touches[0].clientX - lastPanPosition.x;
        const deltaY = e.touches[0].clientY - lastPanPosition.y;
        
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        setLastPanPosition({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        });
      } else if (scale === 1) {
        // Swipe
        setTouchEnd(e.touches[0].clientX);
      }
    }
  }, [initialPinchDistance, initialScale, isPanning, lastPanPosition, scale]);

  const handleTouchEnd = useCallback(() => {
    setInitialPinchDistance(null);
    setIsPanning(false);
    
    if (scale === 1 && touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      
      if (distance > minSwipeDistance && photos.length > 1) {
        goToNext();
      } else if (distance < -minSwipeDistance && photos.length > 1) {
        goToPrevious();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, photos.length, goToNext, goToPrevious, scale]);

  // Double tap to zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2.5);
      }
    }
    lastTapRef.current = now;
  }, [scale, resetZoom]);

  if (!isOpen || photos.length === 0) return null;

  // Stop all event propagation to prevent Dialog from intercepting
  const stopAllPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999]"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
        // Force this element to capture ALL pointer events
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
    >
      {/* Invisible backdrop that captures ALL clicks to prevent pass-through */}
      <div 
        className="absolute inset-0" 
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Close button */}
      <button
        type="button"
        className="absolute top-4 right-4 z-[100001] w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white transition-colors"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fermer"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>

      {/* Previous button */}
      {photos.length > 1 && (
        <button
          type="button"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-[100001] w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white transition-colors"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToPrevious();
          }}
          aria-label="Photo précédente"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      {/* Image container with swipe and zoom support */}
      <div 
        ref={imageContainerRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          padding: '60px 16px 80px 16px',
          pointerEvents: 'auto' 
        }}
        onTouchStart={(e) => {
          handleDoubleTap(e);
          handleTouchStart(e);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: scale === 1 ? 'transform 0.2s ease-out' : 'none',
            transformOrigin: 'center center',
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <OptimizedImage
            src={photos[currentIndex]}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
            containerClassName="max-w-full max-h-full flex items-center justify-center"
            lazy={false}
            showPlaceholder={true}
          />
        </div>
      </div>

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100001]" style={{ pointerEvents: 'none' }}>
          <div className="text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <ZoomIn className="h-3.5 w-3.5" />
            {Math.round(scale * 100)}%
          </div>
        </div>
      )}

      {/* Reset zoom button */}
      {scale > 1 && (
        <button
          type="button"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[100001] px-4 py-2 rounded-full bg-white/90 text-black text-sm font-medium shadow-lg"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resetZoom();
          }}
        >
          Réinitialiser le zoom
        </button>
      )}

      {/* Next button */}
      {photos.length > 1 && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-[100001] w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white transition-colors"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToNext();
          }}
          aria-label="Photo suivante"
        >
          <ChevronRight className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      {/* Position indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100001]" style={{ pointerEvents: 'none' }}>
          <div className="text-white text-sm font-medium bg-black/70 px-4 py-2 rounded-full">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
