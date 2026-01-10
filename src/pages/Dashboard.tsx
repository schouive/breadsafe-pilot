import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ControlPointCard } from '@/components/dashboard/ControlPointCard';
import { RecentControls } from '@/components/dashboard/RecentControls';
import { NonConformityAlert } from '@/components/dashboard/NonConformityAlert';
import { ConformityChart } from '@/components/dashboard/ConformityChart';
import { ControlForm } from '@/components/controls/ControlForm';
import { CONTROL_POINTS, ControlPoint, ControlRecord, NonConformity, ControlStatus } from '@/types/haccp';

// Mock data for demonstration
const mockRecentControls: ControlRecord[] = [
  {
    id: '1',
    controlPointId: 'cp1',
    controlPointCode: 'CP1_TEMPERATURE_REFRIGERE',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    operatorId: 'user1',
    operatorName: 'Marie D.',
    status: 'conforme',
    value: 3.2,
    product: 'Beurre AOP',
    supplier: 'Lactalis',
  },
  {
    id: '2',
    controlPointId: 'cp2',
    controlPointCode: 'CP2_INTEGRITE',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    operatorId: 'user1',
    operatorName: 'Marie D.',
    status: 'conforme',
    product: 'Farine T55',
  },
  {
    id: '3',
    controlPointId: 'cp6',
    controlPointCode: 'CP6_STOCKAGE_POSITIF',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    operatorId: 'user2',
    operatorName: 'Jean P.',
    status: 'acceptable',
    value: 5.8,
    notes: 'Légèrement au-dessus, surveillance renforcée',
  },
  {
    id: '4',
    controlPointId: 'cp7',
    controlPointCode: 'CP7_STOCKAGE_NEGATIF',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    operatorId: 'user2',
    operatorName: 'Jean P.',
    status: 'conforme',
    value: -19.5,
  },
];

const mockNonConformities: NonConformity[] = [
  {
    id: 'nc1',
    controlRecordId: 'ctrl5',
    controlPointCode: 'CP1_TEMPERATURE_REFRIGERE',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    description: 'Température à réception: 8.5°C - Dépassement limite acceptable',
    severity: 'major',
    status: 'open',
    assignedTo: 'DG',
    photos: [],
  },
  {
    id: 'nc2',
    controlRecordId: 'ctrl6',
    controlPointCode: 'CP4_ALLERGENES',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    description: 'Nouvelle composition margarine non conforme à la référence',
    severity: 'critical',
    status: 'in_progress',
    assignedTo: 'Assistant Qualité',
    correctiveAction: 'Contact fournisseur en cours pour obtenir la nouvelle fiche technique',
    photos: [],
  },
  {
    id: 'nc3',
    controlRecordId: 'ctrl7',
    controlPointCode: 'CP5_CORPS_ETRANGER',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    description: 'Détection corps étranger métallique - Lot éjecté',
    severity: 'critical',
    status: 'open',
    assignedTo: 'DG',
    photos: [],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedCP, setSelectedCP] = useState<ControlPoint | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [controls, setControls] = useState<ControlRecord[]>(mockRecentControls);

  const stats = {
    totalControlsToday: 12,
    completedControlsToday: 8,
    conformeCount: 15,
    acceptableCount: 3,
    nonConformeCount: 2,
    openNonConformities: mockNonConformities.filter(nc => nc.status === 'open' || nc.status === 'in_progress').length,
    conformityRate: 75,
  };

  const getLastStatusForCP = (cpCode: string): ControlStatus => {
    const lastControl = controls.find(c => c.controlPointCode === cpCode);
    return lastControl?.status || 'pending';
  };

  const getLastControlTimeForCP = (cpCode: string): string | undefined => {
    const lastControl = controls.find(c => c.controlPointCode === cpCode);
    if (!lastControl) return undefined;
    return new Intl.DateTimeFormat('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(lastControl.timestamp);
  };

  const handleStartControl = (cp: ControlPoint) => {
    setSelectedCP(cp);
    setIsFormOpen(true);
  };

  const handleSubmitControl = (data: {
    status: ControlStatus;
    value?: number;
    notes?: string;
    lotNumber?: string;
    supplier?: string;
    product?: string;
  }) => {
    if (!selectedCP) return;

    const newControl: ControlRecord = {
      id: `ctrl-${Date.now()}`,
      controlPointId: selectedCP.id,
      controlPointCode: selectedCP.code,
      timestamp: new Date(),
      operatorId: 'current-user',
      operatorName: 'Assistant Qualité',
      status: data.status,
      value: data.value,
      notes: data.notes,
      lotNumber: data.lotNumber,
      supplier: data.supplier,
      product: data.product,
    };

    setControls([newControl, ...controls]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord HACCP</h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble des contrôles et de la conformité
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Contrôles aujourd'hui"
          value={`${stats.completedControlsToday}/${stats.totalControlsToday}`}
          subtitle="réalisés"
          icon={ClipboardCheck}
        />
        <StatCard
          title="Taux de conformité"
          value={`${stats.conformityRate}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
          variant="success"
        />
        <StatCard
          title="Conformes"
          value={stats.conformeCount}
          subtitle="cette semaine"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="NC ouvertes"
          value={stats.openNonConformities}
          subtitle="à traiter"
          icon={AlertTriangle}
          variant={stats.openNonConformities > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Non-conformity Alert */}
      <NonConformityAlert 
        nonConformities={mockNonConformities} 
        onViewAll={() => navigate('/non-conformities')}
      />

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Control Points */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Points de Contrôle (CP)</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CONTROL_POINTS.slice(0, 4).map((cp) => (
              <ControlPointCard
                key={cp.id}
                controlPoint={cp}
                lastStatus={getLastStatusForCP(cp.code)}
                lastControlTime={getLastControlTimeForCP(cp.code)}
                onStartControl={handleStartControl}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ConformityChart
            conforme={stats.conformeCount}
            acceptable={stats.acceptableCount}
            nonconforme={stats.nonConformeCount}
          />
          <RecentControls controls={controls} />
        </div>
      </div>

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
