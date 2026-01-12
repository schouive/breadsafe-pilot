import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CameraCapture } from './CameraCapture';

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  userId: string;
}

export function PhotoCapture({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 5,
  userId 
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!file) return null;

    try {
      let fileExt = file.name.split('.').pop();
      if (!fileExt || fileExt === file.name) {
        const mimeExt = file.type.split('/')[1];
        fileExt = mimeExt === 'jpeg' ? 'jpg' : (mimeExt || 'jpg');
      }
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('control-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg'
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
  }, [userId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos autorisées`);
      event.target.value = '';
      return;
    }

    const file = files[0];
    
    if (file.type && !file.type.startsWith('image/')) {
      toast.error('Seules les images sont acceptées');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 10 Mo');
      event.target.value = '';
      return;
    }

    setUploading(true);
    const url = await uploadPhoto(file);
    if (url) {
      onPhotosChange([...photos, url]);
      toast.success('Photo ajoutée');
    } else {
      toast.error('Erreur lors de l\'envoi de la photo');
    }
    setUploading(false);
    event.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    toast.success('Photo supprimée');
  };

  const handleCameraPhotos = (urls: string[]) => {
    onPhotosChange([...photos, ...urls]);
    setShowCamera(false);
  };

  const openCamera = () => {
    setShowCamera(true);
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <>
      <div className="space-y-4">
        {/* Already uploaded photos */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Photos enregistrées</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div 
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload buttons */}
        {canAddMore && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 touch-target"
              onClick={openCamera}
              disabled={uploading}
            >
              <Camera className="mr-2 h-5 w-5" />
              Appareil photo
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="flex-1 touch-target"
              onClick={openGallery}
              disabled={uploading}
            >
            {uploading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-5 w-5" />
            )}
              Galerie
            </Button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Photo count */}
        <p className="text-xs text-muted-foreground text-center">
          {photos.length} / {maxPhotos} photos enregistrées
        </p>
      </div>

      {/* Fullscreen camera */}
      {showCamera && (
        <CameraCapture
          onPhotosConfirmed={handleCameraPhotos}
          onClose={() => setShowCamera(false)}
          userId={userId}
          maxPhotos={maxPhotos}
          existingPhotosCount={photos.length}
        />
      )}
    </>
  );
}
