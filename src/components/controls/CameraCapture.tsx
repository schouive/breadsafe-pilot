import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingPhoto {
  id: string;
  dataUrl: string;
}

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (photos: Blob[]) => void;
  maxPhotos?: number;
}

export function CameraCapture({ 
  isOpen, 
  onClose, 
  onConfirm,
  maxPhotos = 5 
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setPendingPhotos([]);
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || pendingPhotos.length >= maxPhotos) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Get data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    const newPhoto: PendingPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      dataUrl
    };
    
    setPendingPhotos(prev => [...prev, newPhoto]);
  }, [pendingPhotos.length, maxPhotos]);

  const removePhoto = (id: string) => {
    setPendingPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleConfirm = async () => {
    // Convert data URLs to Blobs
    const blobs: Blob[] = [];
    
    for (const photo of pendingPhotos) {
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      blobs.push(blob);
    }
    
    onConfirm(blobs);
    onClose();
  };

  const handleCancel = () => {
    setPendingPhotos([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Header with close and confirm buttons */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={handleCancel}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white"
        >
          <X className="h-6 w-6" />
        </button>
        
        {pendingPhotos.length > 0 && (
          <button
            onClick={handleConfirm}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black shadow-lg"
          >
            <Check className="h-6 w-6" />
          </button>
        )}
      </div>
      
      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
            <div>
              <p className="text-lg mb-4">{error}</p>
              <Button variant="secondary" onClick={startCamera}>
                Réessayer
              </Button>
            </div>
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
      </div>
      
      {/* Capture button */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center">
        <button
          onClick={capturePhoto}
          disabled={!cameraReady || pendingPhotos.length >= maxPhotos}
          className={cn(
            "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
            cameraReady && pendingPhotos.length < maxPhotos
              ? "bg-white/20 active:scale-90"
              : "bg-gray-500/50 opacity-50"
          )}
        >
          <div className="w-16 h-16 rounded-full bg-white" />
        </button>
      </div>
      
      {/* Photo count indicator */}
      {pendingPhotos.length > 0 && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center">
          <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {pendingPhotos.length} / {maxPhotos}
          </span>
        </div>
      )}
      
      {/* Thumbnails strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur rounded-t-3xl px-4 py-4 min-h-[100px]">
        {pendingPhotos.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            Prenez des photos avec le bouton ci-dessus
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pendingPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
              >
                <img
                  src={photo.dataUrl}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-destructive text-destructive-foreground rounded-full shadow-md"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
