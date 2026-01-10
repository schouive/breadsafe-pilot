import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ControlPointCard } from '@/components/dashboard/ControlPointCard';
import { ControlForm } from '@/components/controls/ControlForm';
import { ReceptionControlForm, ReceptionFormData } from '@/components/controls/ReceptionControlForm';
import { StorageControlForm, StorageFormData } from '@/components/controls/StorageControlForm';
import { CONTROL_POINTS, ControlPoint, ControlStatus } from '@/types/haccp';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function Controls() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCP, setSelectedCP] = useState<ControlPoint | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReceptionFormOpen, setIsReceptionFormOpen] = useState(false);
  const [isStorageFormOpen, setIsStorageFormOpen] = useState(false);

  const filteredControlPoints = CONTROL_POINTS.filter(cp =>
    cp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cp.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartControl = (cp: ControlPoint) => {
    setSelectedCP(cp);
    if (cp.code === 'CP_RECEPTION') {
      setIsReceptionFormOpen(true);
    } else if (cp.code === 'CP_STOCKAGE') {
      setIsStorageFormOpen(true);
    } else {
      setIsFormOpen(true);
    }
  };

  const handleSubmitControl = async (data: {
    status: ControlStatus;
    value?: number;
    notes?: string;
  }) => {
    if (!user || !selectedCP) return;

    try {
      const { error } = await supabase
        .from('control_records')
        .insert({
          control_point_code: selectedCP.code,
          operator_id: user.id,
          status: data.status,
          temperature: data.value,
          notes: data.notes,
        });

      if (error) throw error;
      toast.success(`Contrôle ${selectedCP.name} enregistré`);
    } catch (error) {
      console.error('Error saving control:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleSubmitReceptionControl = async (data: ReceptionFormData) => {
    if (!user || !selectedCP) return;

    try {
      const { error } = await supabase
        .from('control_records')
        .insert({
          control_point_code: 'CP_RECEPTION',
          operator_id: user.id,
          status: data.status,
          temperature: data.temperature,
          temperature_conforme: data.temperatureConforme,
          integrite_conforme: data.integriteConforme,
          integrite_notes: data.integriteNotes,
          dlc_date: data.dlcDate,
          dlc_conforme: data.dlcConforme,
          dlc_notes: data.dlcNotes,
          allergenes_conformes: data.allergenesConformes,
          allergenes_notes: data.allergenesNotes,
          notes: data.notes,
          lot_number: data.lotNumber,
          supplier: data.supplier,
          product: data.product,
          photos: data.photos,
        });

      if (error) throw error;
      
      // If non-conformity, create NC record
      if (data.status === 'nonconforme') {
        // Get the inserted record ID
        const { data: records } = await supabase
          .from('control_records')
          .select('id')
          .eq('operator_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (records && records[0]) {
          await supabase
            .from('non_conformities')
            .insert({
              control_record_id: records[0].id,
              control_point_code: 'CP_RECEPTION',
              description: `Non-conformité détectée: ${data.product} - ${data.supplier}`,
              severity: 'major',
              photos: data.photos,
            });
        }
      }
      
      toast.success('Contrôle réception enregistré');
    } catch (error) {
      console.error('Error saving reception control:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Points de Contrôle</h1>
          <p className="text-muted-foreground mt-1">
            Gérez et effectuez vos contrôles HACCP
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un point de contrôle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="touch-target">
          <Filter className="mr-2 h-4 w-4" />
          Filtrer
        </Button>
      </div>

      {/* Control Points Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredControlPoints.map((cp) => (
          <ControlPointCard
            key={cp.id}
            controlPoint={cp}
            onStartControl={handleStartControl}
          />
        ))}
      </div>

      {filteredControlPoints.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun point de contrôle trouvé</p>
        </div>
      )}

      {/* Standard Control Form Dialog */}
      <ControlForm
        controlPoint={selectedCP}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCP(null);
        }}
        onSubmit={handleSubmitControl}
      />

      {/* Reception Control Form Dialog */}
      <ReceptionControlForm
        controlPoint={selectedCP}
        isOpen={isReceptionFormOpen}
        onClose={() => {
          setIsReceptionFormOpen(false);
          setSelectedCP(null);
        }}
        onSubmit={handleSubmitReceptionControl}
      />

      {/* Storage Control Form Dialog */}
      <StorageControlForm
        controlPoint={selectedCP}
        isOpen={isStorageFormOpen}
        onClose={() => {
          setIsStorageFormOpen(false);
          setSelectedCP(null);
        }}
        onSubmit={(data: StorageFormData) => {
          // Storage temp already saved by the form
          console.log('Storage control saved:', data);
        }}
      />
    </div>
  );
}
