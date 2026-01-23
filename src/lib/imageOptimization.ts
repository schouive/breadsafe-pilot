/**
 * Image Optimization Utilities
 * - Resize images to max width (1200px default)
 * - Compress to JPEG with configurable quality (70-80%)
 * - Generate thumbnails for preview
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

export interface OptimizedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.75,
  format: 'jpeg'
};

const THUMBNAIL_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 300,
  maxHeight: 300,
  quality: 0.6,
  format: 'jpeg'
};

/**
 * Load an image from a File or Blob
 */
function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(source);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Only resize if image is larger than max dimensions
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width, height };
}

/**
 * Resize and compress an image
 */
export async function optimizeImage(
  source: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const img = await loadImage(source);

  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth!,
    opts.maxHeight!
  );

  // Create canvas for resizing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Convert to blob with compression
  const mimeType = opts.format === 'webp' ? 'image/webp' : 'image/jpeg';
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not create blob'));
          return;
        }

        const dataUrl = canvas.toDataURL(mimeType, opts.quality);
        resolve({ blob, dataUrl, width, height });
      },
      mimeType,
      opts.quality
    );
  });
}

/**
 * Generate a thumbnail from an image
 */
export async function generateThumbnail(
  source: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  return optimizeImage(source, { ...THUMBNAIL_OPTIONS, ...options });
}

/**
 * Optimize an image from a data URL
 */
export async function optimizeFromDataUrl(
  dataUrl: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return optimizeImage(blob, options);
}

/**
 * Check if an image needs optimization (larger than target)
 */
export function needsOptimization(
  width: number,
  height: number,
  maxWidth = DEFAULT_OPTIONS.maxWidth!,
  maxHeight = DEFAULT_OPTIONS.maxHeight!
): boolean {
  return width > maxWidth || height > maxHeight;
}

/**
 * Get image dimensions from a File or Blob
 */
export async function getImageDimensions(
  source: File | Blob
): Promise<{ width: number; height: number }> {
  const img = await loadImage(source);
  const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
  URL.revokeObjectURL(img.src);
  return dimensions;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
