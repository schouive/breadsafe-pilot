import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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

  const minSwipeDistance = 50;

  // Reset index when opening with a new initial index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

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
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    // Use capture phase to intercept before Dialog
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, photos.length, onClose]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    
    if (distance > minSwipeDistance && photos.length > 1) {
      goToNext();
    } else if (distance < -minSwipeDistance && photos.length > 1) {
      goToPrevious();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, photos.length, goToNext, goToPrevious]);

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
        className="absolute top-4 right-4 z-[100001] w-16 h-16 flex items-center justify-center rounded-full bg-white text-black shadow-2xl"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fermer"
      >
        <X className="h-8 w-8" strokeWidth={2.5} />
      </button>

      {/* Previous button */}
      {photos.length > 1 && (
        <button
          type="button"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-[100001] w-16 h-16 flex items-center justify-center rounded-full bg-white text-black shadow-2xl"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToPrevious();
          }}
          aria-label="Photo précédente"
        >
          <ChevronLeft className="h-10 w-10" strokeWidth={2.5} />
        </button>
      )}

      {/* Image container with swipe support */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          padding: '80px 80px 100px 80px',
          pointerEvents: 'auto' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
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

      {/* Next button */}
      {photos.length > 1 && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-[100001] w-16 h-16 flex items-center justify-center rounded-full bg-white text-black shadow-2xl"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToNext();
          }}
          aria-label="Photo suivante"
        >
          <ChevronRight className="h-10 w-10" strokeWidth={2.5} />
        </button>
      )}

      {/* Position indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100001]" style={{ pointerEvents: 'none' }}>
          <div className="text-white text-xl font-bold bg-black/80 px-6 py-3 rounded-full">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
