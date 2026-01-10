import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ControlPointCard } from '@/components/dashboard/ControlPointCard';
import { ControlForm } from '@/components/controls/ControlForm';
import { CONTROL_POINTS, ControlPoint, ControlStatus } from '@/types/haccp';
import { toast } from 'sonner';

export default function Controls() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCP, setSelectedCP] = useState<ControlPoint | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredControlPoints = CONTROL_POINTS.filter(cp =>
    cp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cp.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartControl = (cp: ControlPoint) => {
    setSelectedCP(cp);
    setIsFormOpen(true);
  };

  const handleSubmitControl = (data: {
    status: ControlStatus;
    value?: number;
    notes?: string;
  }) => {
    toast.success(`Contrôle ${selectedCP?.name} enregistré`);
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

      {/* Control Form Dialog */}
      <ControlForm
        controlPoint={selectedCP}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCP(null);
        }}
        onSubmit={handleSubmitControl}
      />
    </div>
  );
}
