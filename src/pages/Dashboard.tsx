import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentControls } from '@/components/dashboard/RecentControls';
import { NonConformityAlert } from '@/components/dashboard/NonConformityAlert';
import { ConformityChart } from '@/components/dashboard/ConformityChart';
import { ControlRecord, NonConformity, ControlStatus } from '@/types/haccp';
import { useRecentControlRecords } from '@/hooks/useControlRecords';
import { useStorageTemperatureRecordsWithRooms } from '@/hooks/useColdRooms';
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

  // Fetch real control records from database
  const { data: recentRecords } = useRecentControlRecords();
  
  // Fetch storage temperature records
  const { data: storageRecords } = useStorageTemperatureRecordsWithRooms(10);

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
  const controlRecords: ControlRecord[] = recentRecords?.map(record => ({
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

  // Transform storage temperature records to ControlRecord format
  const storageControls: ControlRecord[] = storageRecords?.map(record => ({
    id: record.id,
    controlPointId: 'CP_STOCKAGE',
    controlPointCode: 'CP_STOCKAGE' as any,
    timestamp: new Date(record.recorded_at),
    operatorId: record.operator_id,
    operatorName: 'Opérateur',
    status: record.is_conforme ? 'conforme' as ControlStatus : 'nonconforme' as ControlStatus,
    value: record.temperature,
    notes: record.notes,
    coldRoomName: record.cold_rooms?.name,
  })) || [];

  // Combine and sort all controls by timestamp
  const controls: ControlRecord[] = [...controlRecords, ...storageControls]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

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
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Chart */}
        <ConformityChart
          conforme={stats.conformeCount}
          acceptable={stats.acceptableCount}
          nonconforme={stats.nonConformeCount}
        />
        
        {/* Recent Controls */}
        <RecentControls controls={controls} />
      </div>
    </div>
  );
}
