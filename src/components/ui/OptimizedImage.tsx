import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  /** Source URL of the image */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Container CSS classes (for aspect ratio containers) */
  containerClassName?: string;
  /** Whether to use lazy loading (default: true) */
  lazy?: boolean;
  /** Show placeholder while loading (default: true) */
  showPlaceholder?: boolean;
  /** Placeholder type: 'skeleton' | 'blur' */
  placeholderType?: 'skeleton' | 'blur';
  /** Callback when image loads */
  onLoadComplete?: () => void;
  /** Callback when image fails to load */
  onLoadError?: () => void;
  /** Whether to show error state (default: true) */
  showErrorState?: boolean;
}

// Simple in-memory cache for loaded images
const imageCache = new Set<string>();

export function OptimizedImage({
  src,
  alt,
  className,
  containerClassName,
  lazy = true,
  showPlaceholder = true,
  placeholderType = 'skeleton',
  onLoadComplete,
  onLoadError,
  showErrorState = true,
  ...imgProps
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(!imageCache.has(src));
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Reset state when src changes
  useEffect(() => {
    if (imageCache.has(src)) {
      setIsLoading(false);
      setHasError(false);
    } else {
      setIsLoading(true);
      setHasError(false);
    }
  }, [src]);

  const handleLoad = () => {
    imageCache.add(src);
    setIsLoading(false);
    onLoadComplete?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onLoadError?.();
  };

  // Don't render image until in view (for lazy loading)
  const shouldRenderImage = !lazy || isInView;

  // Extract backgroundColor from style if provided
  const bgStyle = imgProps.style?.backgroundColor;
  const containerStyle = bgStyle ? { backgroundColor: bgStyle } : undefined;

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden', containerClassName)}
      style={containerStyle}
    >
      {/* Placeholder/Loading state */}
      {showPlaceholder && isLoading && !hasError && (
        <div className="absolute inset-0 z-10" style={containerStyle}>
          {placeholderType === 'skeleton' ? (
            <Skeleton className="w-full h-full" style={containerStyle} />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" style={containerStyle} />
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && showErrorState && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-muted/50 text-muted-foreground" style={containerStyle}>
          <ImageOff className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-xs">Image non disponible</span>
        </div>
      )}

      {/* Actual image */}
      {shouldRenderImage && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          style={containerStyle}
          {...imgProps}
        />
      )}

      {/* Placeholder for lazy loading before in view */}
      {!shouldRenderImage && (
        <div className={cn('bg-muted', className)} style={{ aspectRatio: 'auto', ...containerStyle }} />
      )}
    </div>
  );
}

/**
 * Preload images into cache
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (imageCache.has(url)) {
            resolve();
            return;
          }
          const img = new Image();
          img.onload = () => {
            imageCache.add(url);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  );
}

/**
 * Clear image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}
