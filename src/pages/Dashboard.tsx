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
import { ReceptionControlForm } from '@/components/controls/ReceptionControlForm';
import { StorageControlForm, StorageFormData } from '@/components/controls/StorageControlForm';
import { CONTROL_POINTS, ControlPoint, ControlRecord, NonConformity, ControlStatus } from '@/types/haccp';
import { useRecentControlRecords, useCreateControlRecord, useCreateReceptionControl, ReceptionFormData } from '@/hooks/useControlRecords';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Mock non-conformities for now (to be replaced with real data later)
const mockNonConformities: NonConformity[] = [
  {
    id: 'nc1',
    controlRecordId: 'ctrl5',
    controlPointCode: 'CP_RECEPTION',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    description: 'Température à réception: 8.5°C - Dépassement limite acceptable',
    severity: 'major',
    status: 'open',
    assignedTo: 'DG',
    photos: [],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCP, setSelectedCP] = useState<ControlPoint | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReceptionFormOpen, setIsReceptionFormOpen] = useState(false);
  const [isStorageFormOpen, setIsStorageFormOpen] = useState(false);

  // Fetch real control records from database
  const { data: recentRecords, isLoading } = useRecentControlRecords();
  const createControlRecord = useCreateControlRecord();
  const createReceptionControl = useCreateReceptionControl();

  // Fetch non-conformities
  const { data: nonConformities } = useQuery({
    queryKey: ['non_conformities', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_conformities')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Transform DB records to ControlRecord format for RecentControls
  const controls: ControlRecord[] = recentRecords?.map(record => ({
    id: record.id,
    controlPointId: record.control_point_code,
    controlPointCode: record.control_point_code as any,
    timestamp: new Date(record.timestamp),
    operatorId: record.operator_id,
    operatorName: (record as any).profiles?.full_name || 'Opérateur',
    status: record.status as ControlStatus,
    value: record.temperature,
    notes: record.notes,
    supplier: record.supplier,
    product: record.product,
  })) || [];

  // Calculate stats
  const todayControls = controls.filter(c => {
    const today = new Date();
    return c.timestamp.toDateString() === today.toDateString();
  });

  const weekControls = controls.filter(c => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return c.timestamp >= weekAgo;
  });

  const conformeCount = weekControls.filter(c => c.status === 'conforme').length;
  const acceptableCount = weekControls.filter(c => c.status === 'acceptable').length;
  const nonConformeCount = weekControls.filter(c => c.status === 'nonconforme').length;
  const total = conformeCount + acceptableCount + nonConformeCount;

  const stats = {
    totalControlsToday: 12,
    completedControlsToday: todayControls.length,
    conformeCount,
    acceptableCount,
    nonConformeCount,
    openNonConformities: nonConformities?.length || 0,
    conformityRate: total > 0 ? Math.round((conformeCount / total) * 100) : 100,
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

    createControlRecord.mutate({
      control_point_code: selectedCP.code as any,
      operator_id: user.id,
      status: data.status,
      temperature: data.value,
      notes: data.notes,
    });
  };

  const handleSubmitReceptionControl = async (data: ReceptionFormData) => {
    if (!user) return;

    createReceptionControl.mutate({
      userId: user.id,
      data,
    });
  };

  // Transform non-conformities for the alert component
  const transformedNonConformities: NonConformity[] = nonConformities?.map(nc => ({
    id: nc.id,
    controlRecordId: nc.control_record_id,
    controlPointCode: nc.control_point_code as any,
    createdAt: new Date(nc.created_at),
    description: nc.description,
    severity: nc.severity as any,
    status: nc.status as any,
    assignedTo: nc.assigned_to || '',
    photos: nc.photos || [],
  })) || mockNonConformities;

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
        nonConformities={transformedNonConformities} 
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

      {/* Control Form Dialog - Standard */}
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
