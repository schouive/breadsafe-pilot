import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  userId: string;
}

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

export function PhotoCapture({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 5,
  userId 
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!file) return null;

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('control-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
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

    const totalPhotos = photos.length + pendingPhotos.length;
    if (totalPhotos >= maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos autorisées`);
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont acceptées');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 10 Mo');
      return;
    }

    // Create a preview URL for the pending photo
    const preview = URL.createObjectURL(file);
    const newPendingPhoto: PendingPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      preview
    };

    setPendingPhotos(prev => [...prev, newPendingPhoto]);

    // Reset input
    event.target.value = '';
  };

  const handleRemovePendingPhoto = (id: string) => {
    setPendingPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleRemoveUploadedPhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    toast.success('Photo supprimée');
  };

  const handleConfirmPhotos = async () => {
    if (pendingPhotos.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];
    let failedCount = 0;

    for (const pending of pendingPhotos) {
      const url = await uploadPhoto(pending.file);
      if (url) {
        uploadedUrls.push(url);
      } else {
        failedCount++;
      }
      // Clean up preview URL
      URL.revokeObjectURL(pending.preview);
    }

    if (uploadedUrls.length > 0) {
      onPhotosChange([...photos, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} photo(s) ajoutée(s)`);
    }

    if (failedCount > 0) {
      toast.error(`${failedCount} photo(s) n'ont pas pu être envoyée(s)`);
    }

    setPendingPhotos([]);
    setUploading(false);
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  const totalPhotos = photos.length + pendingPhotos.length;
  const canAddMore = totalPhotos < maxPhotos;

  return (
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
                  onClick={() => handleRemoveUploadedPhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending photos (not yet uploaded) */}
      {pendingPhotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">En attente d'envoi</p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {pendingPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/30"
                >
                  <img
                    src={photo.preview}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePendingPhoto(photo.id)}
                    className="absolute top-1 right-1 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Confirm button */}
            <Button
              type="button"
              onClick={handleConfirmPhotos}
              disabled={uploading}
              className="w-full"
              size="sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Valider {pendingPhotos.length} photo(s)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Upload buttons */}
      {canAddMore && (
        <div className="flex gap-2">
          {/* Camera button (mobile) */}
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
          
          {/* Gallery button */}
          <Button
            type="button"
            variant="outline"
            className="flex-1 touch-target"
            onClick={openGallery}
            disabled={uploading}
          >
            <ImageIcon className="mr-2 h-5 w-5" />
            Galerie
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
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
        {pendingPhotos.length > 0 && ` (+${pendingPhotos.length} en attente)`}
      </p>
    </div>
  );
}
