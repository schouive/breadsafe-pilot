import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PhotoCapture } from '@/components/controls/PhotoCapture';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const formSchema = z.object({
  notes: z.string().optional(),
  photos: z.array(z.string()).min(1, 'Au moins une photo est requise'),
});

type FormData = z.infer<typeof formSchema>;

interface ProductionControlFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductionControlForm({ onSuccess, onCancel }: ProductionControlFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
      photos: [],
    },
  });

  const handlePhotosChange = (newPhotos: string[]) => {
    setPhotos(newPhotos);
    form.setValue('photos', newPhotos);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('control_records').insert({
        control_point_code: 'CP_PRODUCTION',
        operator_id: user.id,
        status: 'conforme',
        photos: data.photos,
        notes: data.notes || null,
      });

      if (error) throw error;

      // Invalidate cache to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['control_records'] });

      toast.success('Contrôle de production enregistré');
      onSuccess?.();
      navigate('/haccp/controls/CP_PRODUCTION');
    } catch (error) {
      console.error('Error saving production control:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Traçabilité Production - {today}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Prenez en photo les étiquettes avec les numéros de lot de toutes les matières premières 
                utilisées dans la fabrication du jour.
              </p>
            </div>

            <FormField
              control={form.control}
              name="photos"
              render={() => (
                <FormItem>
                  <FormLabel>Photos des numéros de lot *</FormLabel>
                  <FormControl>
                    <PhotoCapture
                      photos={photos}
                      onPhotosChange={handlePhotosChange}
                      maxPhotos={20}
                      userId={user?.id || 'anonymous'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Remarques sur la production du jour..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
          )}
          <Button 
            type="submit" 
            className="flex-1" 
            disabled={isSubmitting || photos.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
