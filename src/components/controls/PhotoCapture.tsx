import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadBlob = useCallback(async (blob: Blob, index: number) => {
    try {
      const fileName = `${userId}/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('control-photos')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('control-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }, [userId]);

  const uploadFile = useCallback(async (file: File) => {
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

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('control-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }, [userId]);

  const handleCameraConfirm = async (blobs: Blob[]) => {
    if (blobs.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];
    let failedCount = 0;

    for (let i = 0; i < blobs.length; i++) {
      const url = await uploadBlob(blobs[i], i);
      if (url) {
        uploadedUrls.push(url);
      } else {
        failedCount++;
      }
    }

    if (uploadedUrls.length > 0) {
      onPhotosChange([...photos, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} photo(s) ajoutée(s)`);
    }

    if (failedCount > 0) {
      toast.error(`${failedCount} photo(s) n'ont pas pu être envoyée(s)`);
    }

    setUploading(false);
  };

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
    const url = await uploadFile(file);
    if (url) {
      onPhotosChange([...photos, url]);
      toast.success('Photo ajoutée');
    } else {
      toast.error('Erreur lors de l\'upload');
    }
    setUploading(false);
    event.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    toast.success('Photo supprimée');
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = photos.length < maxPhotos;
  const remainingPhotos = maxPhotos - photos.length;

  return (
    <div className="space-y-4">
      {/* Uploaded photos */}
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
                  className="absolute top-1 right-1 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-md opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
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
            onClick={() => setCameraOpen(true)}
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

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo count */}
      <p className="text-xs text-muted-foreground text-center">
        {photos.length} / {maxPhotos} photos
      </p>

      {/* Full-screen camera capture */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onConfirm={handleCameraConfirm}
        maxPhotos={remainingPhotos}
      />
    </div>
  );
}
