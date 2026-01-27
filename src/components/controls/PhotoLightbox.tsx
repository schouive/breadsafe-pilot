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

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const handlePrevious = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goToPrevious();
  }, [goToPrevious]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goToNext();
  }, [goToNext]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

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

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
    >
      {/* Close button */}
      <button
        type="button"
        className="absolute top-4 right-4 z-[100000] w-14 h-14 flex items-center justify-center rounded-full bg-white text-black shadow-2xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200"
        onClick={handleClose}
        aria-label="Fermer"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Previous button */}
      {photos.length > 1 && (
        <button
          type="button"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-[100000] w-14 h-14 flex items-center justify-center rounded-full bg-white text-black shadow-2xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200"
          onClick={handlePrevious}
          aria-label="Photo précédente"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Image container with swipe support */}
      <div 
        className="flex items-center justify-center w-full h-full p-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
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
          className="absolute right-3 top-1/2 -translate-y-1/2 z-[100000] w-14 h-14 flex items-center justify-center rounded-full bg-white text-black shadow-2xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200"
          onClick={handleNext}
          aria-label="Photo suivante"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Position indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100000] pointer-events-none">
          <div className="text-white text-lg font-semibold bg-black/80 px-5 py-2 rounded-full border border-white/30">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
