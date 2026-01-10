import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!file) return null;

    setUploading(true);
    
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
      toast.error('Erreur lors de l\'upload de la photo');
      return null;
    } finally {
      setUploading(false);
    }
  }, [userId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= maxPhotos) {
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

    const url = await uploadPhoto(file);
    if (url) {
      onPhotosChange([...photos, url]);
      toast.success('Photo ajoutée');
    }

    // Reset input
    event.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    toast.success('Photo supprimée');
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Photo preview grid */}
      {photos.length > 0 && (
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
      )}

      {/* Upload buttons */}
      {photos.length < maxPhotos && (
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
            {uploading ? 'Envoi...' : 'Appareil photo'}
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
        {photos.length} / {maxPhotos} photos
      </p>
    </div>
  );
}
