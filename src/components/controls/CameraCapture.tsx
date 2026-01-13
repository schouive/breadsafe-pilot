import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Trash2, Camera, SwitchCamera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onPhotosConfirmed: (urls: string[]) => void;
  onClose: () => void;
  userId: string;
  maxPhotos?: number;
  existingPhotosCount?: number;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  blob: Blob;
}

export function CameraCapture({
  onPhotosConfirmed,
  onClose,
  userId,
  maxPhotos = 5,
  existingPhotosCount = 0
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const remainingSlots = maxPhotos - existingPhotosCount;

  // Initialize camera
  const startCamera = useCallback(async () => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setCameraReady(false);

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('getUserMedia not available, using fallback');
      setUseFallback(true);
      setCameraReady(true);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
          }).catch(err => {
            console.error('Video play error:', err);
            setUseFallback(true);
            setCameraReady(true);
          });
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      // Fallback to file input on error
      setUseFallback(true);
      setCameraReady(true);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  // Toggle between front and rear camera
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Handle file input for fallback mode
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (capturedPhotos.length >= remainingSlots) {
      toast.error(`Maximum ${maxPhotos} photos autorisées`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // Convert data URL to blob
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const newPhoto: CapturedPhoto = {
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            dataUrl,
            blob
          };
          setCapturedPhotos(prev => [...prev, newPhoto]);
        });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, [capturedPhotos.length, remainingSlots, maxPhotos]);

  const capturePhoto = useCallback(() => {
    if (useFallback) {
      // Trigger file input for fallback
      fileInputRef.current?.click();
      return;
    }

    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    if (capturedPhotos.length >= remainingSlots) {
      toast.error(`Maximum ${maxPhotos} photos autorisées`);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) return;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const newPhoto: CapturedPhoto = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        dataUrl,
        blob
      };

      setCapturedPhotos(prev => [...prev, newPhoto]);
    }, 'image/jpeg', 0.85);
  }, [useFallback, cameraReady, capturedPhotos.length, remainingSlots, maxPhotos]);

  const removePhoto = useCallback((id: string) => {
    setCapturedPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  const uploadPhoto = async (blob: Blob): Promise<string | null> => {
    try {
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('control-photos')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('control-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleConfirm = async () => {
    if (capturedPhotos.length === 0) {
      onClose();
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];
    let failedCount = 0;

    for (const photo of capturedPhotos) {
      const url = await uploadPhoto(photo.blob);
      if (url) {
        uploadedUrls.push(url);
      } else {
        failedCount++;
      }
    }

    if (uploadedUrls.length > 0) {
      toast.success(`${uploadedUrls.length} photo(s) ajoutée(s)`);
    }

    if (failedCount > 0) {
      toast.error(`${failedCount} photo(s) n'ont pas pu être envoyée(s)`);
    }

    // Stop camera before closing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    onPhotosConfirmed(uploadedUrls);
    setIsUploading(false);
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  // Prevent background scrolling when camera is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ touchAction: 'none', isolation: 'isolate' }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onTouchEnd={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {useFallback ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4 bg-gray-900">
            <Camera className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg mb-2">Mode capture photo</p>
            <p className="text-sm opacity-70">Appuyez sur le bouton ci-dessous pour prendre une photo</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Validate button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isUploading}
          className={cn(
            "absolute top-4 right-4 p-3 rounded-xl bg-white text-black hover:bg-white/90 transition-colors z-10",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <Check className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom section with capture button and thumbnails */}
      <div className="bg-black/80 backdrop-blur-sm pb-safe">
        {/* Capture button row */}
        <div className="flex items-center justify-center gap-8 py-4">
          {/* Empty space for balance */}
          <div className="w-12 h-12" />
          
          {/* Capture button */}
          <button
            type="button"
            onClick={capturePhoto}
            disabled={!cameraReady || isUploading || capturedPhotos.length >= remainingSlots}
            className={cn(
              "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95",
              (!cameraReady || isUploading || capturedPhotos.length >= remainingSlots) && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>

          {/* Camera toggle button */}
          {!useFallback && (
            <button
              type="button"
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors active:scale-95"
            >
              <SwitchCamera className="h-6 w-6" />
            </button>
          )}
          {useFallback && <div className="w-12 h-12" />}
        </div>

        {/* Thumbnails */}
        {capturedPhotos.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {capturedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden"
                  >
                    <img
                      src={photo.dataUrl}
                      alt="Capture"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-1 right-1 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Photo count */}
        <p className="text-center text-white/70 text-sm pb-4">
          {capturedPhotos.length} / {remainingSlots} photo(s)
          {isUploading && ' - Envoi en cours...'}
        </p>
      </div>
    </div>,
    document.body
  );
}