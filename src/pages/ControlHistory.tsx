import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar as CalendarIcon, CheckCircle, XCircle, AlertTriangle, Thermometer, Snowflake, Camera, ChevronRight, Clock, Package, User, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ControlForm } from '@/components/controls/ControlForm';
import { ReceptionControlForm } from '@/components/controls/ReceptionControlForm';
import { StorageControlForm, StorageFormData } from '@/components/controls/StorageControlForm';
import { ProductionControlForm } from '@/components/controls/ProductionControlForm';
import { ControlDetailModal } from '@/components/controls/ControlDetailModal';
import { ControlEditForm } from '@/components/controls/ControlEditForm';
import { StorageRecordDetailModal } from '@/components/controls/StorageRecordDetailModal';
import { StorageRecordEditForm } from '@/components/controls/StorageRecordEditForm';
import { CONTROL_POINTS, ControlStatus } from '@/types/haccp';
import { useAuth } from '@/hooks/useAuth';
import { useControlRecordsByCode, useCreateControlRecord, useCreateReceptionControl, ReceptionFormData, ControlRecordFromDB } from '@/hooks/useControlRecords';
import { useStorageTemperatureRecordsWithRooms, StorageTemperatureRecordWithRoom } from '@/hooks/useColdRooms';
import { useOperatorNames } from '@/hooks/useOperatorNames';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';

const statusConfig = {
  conforme: {
    label: 'Conforme',
    icon: CheckCircle,
    class: 'bg-success/10 text-success border-success/20',
  },
  acceptable: {
    label: 'Acceptable',
    icon: AlertTriangle,
    class: 'bg-warning/10 text-warning border-warning/20',
  },
  nonconforme: {
    label: 'Non-conforme',
    icon: XCircle,
    class: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  pending: {
    label: 'En attente',
    icon: CalendarIcon,
    class: 'bg-muted text-muted-foreground border-muted',
  },
};

export default function ControlHistory() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReceptionFormOpen, setIsReceptionFormOpen] = useState(false);
  const [isStorageFormOpen, setIsStorageFormOpen] = useState(false);
  const [isProductionFormOpen, setIsProductionFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ControlRecordFromDB | null>(null);
  const [editingRecord, setEditingRecord] = useState<ControlRecordFromDB | null>(null);
  const [selectedStorageRecord, setSelectedStorageRecord] = useState<StorageTemperatureRecordWithRoom | null>(null);
  const [editingStorageRecord, setEditingStorageRecord] = useState<StorageTemperatureRecordWithRoom | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const controlPoint = CONTROL_POINTS.find(cp => cp.code === code);
  const isStorageControl = code === 'CP_STOCKAGE';
  const isProductionControl = code === 'CP_PRODUCTION';
  const isReceptionControl = code === 'CP_RECEPTION';
  const isCP8Control = code === 'CP8_DLC_PERIMEE';
  const { data: suppliers } = useSuppliers();
  
  // Fetch control records for non-storage controls
  const { data: records, isLoading } = useControlRecordsByCode(code || '');
  
  // Fetch storage temperature records for storage control
  const { data: storageRecords, isLoading: storageLoading } = useStorageTemperatureRecordsWithRooms(50);

  // Get all operator IDs for name lookup
  const operatorIds = useMemo(() => {
    const ids: string[] = [];
    if (records) {
      records.forEach(r => r.operator_id && ids.push(r.operator_id));
    }
    if (storageRecords) {
      storageRecords.forEach(r => r.operator_id && ids.push(r.operator_id));
    }
    return ids;
  }, [records, storageRecords]);

  const { data: operatorNames } = useOperatorNames(operatorIds);
  
  const createControlRecord = useCreateControlRecord();
  const createReceptionControl = useCreateReceptionControl();

  const filteredRecords = useMemo(() => {
    let result = records;
    if (result && dateFilter) {
      result = result.filter(r => isSameDay(new Date(r.timestamp), dateFilter));
    }
    if (result && isReceptionControl && supplierFilter !== 'all') {
      const sup = suppliers?.find(s => s.id === supplierFilter);
      if (sup) result = result.filter(r => r.supplier === sup.name);
    }
    return result;
  }, [records, dateFilter, supplierFilter, isReceptionControl, suppliers]);

  const filteredStorageRecords = useMemo(() => {
    if (!storageRecords || !dateFilter) return storageRecords;
    return storageRecords.filter(r => isSameDay(new Date(r.recorded_at), dateFilter));
  }, [storageRecords, dateFilter]);

  if (!controlPoint) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Point de contrôle non trouvé</p>
        <Button onClick={() => navigate('/haccp/controls')} className="mt-4">
          Retour aux contrôles
        </Button>
      </div>
    );
  }

  const handleNewControl = () => {
    if (controlPoint.code === 'CP_RECEPTION') {
      setIsReceptionFormOpen(true);
    } else if (controlPoint.code === 'CP_STOCKAGE') {
      setIsStorageFormOpen(true);
    } else if (controlPoint.code === 'CP_PRODUCTION') {
      setIsProductionFormOpen(true);
    } else {
      setIsFormOpen(true);
    }
  };

  const handleSubmitControl = async (data: {
    status: ControlStatus;
    value?: number;
    notes?: string;
    lotNumber?: string;
    supplier?: string;
    product?: string;
    dlcDate?: string;
  }) => {
    if (!user || !controlPoint) return;

    createControlRecord.mutate({
      control_point_code: controlPoint.code as any,
      operator_id: user.id,
      status: data.status,
      temperature: data.value,
      notes: data.notes,
      lot_number: data.lotNumber,
      supplier: data.supplier,
      product: data.product,
      dlc_date: data.dlcDate,
    });
  };

  const handleSubmitReceptionControl = async (data: ReceptionFormData) => {
    if (!user) return;
    createReceptionControl.mutate({
      userId: user.id,
      data,
    });
  };


  const currentLoading = isStorageControl ? storageLoading : isLoading;

  const getStorageStatus = (isConforme: boolean, temp: number, room: { temp_min: number; temp_max: number } | null): keyof typeof statusConfig => {
    if (isConforme) return 'conforme';
    if (!room) return 'nonconforme';
    
    const acceptableMin = room.temp_min - 3;
    const acceptableMax = room.temp_max + 3;
    
    if (temp >= acceptableMin && temp <= acceptableMax) {
      return 'acceptable';
    }
    
    return 'nonconforme';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/haccp/controls')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{controlPoint.name}</h1>
            <p className="text-muted-foreground mt-1">
              {controlPoint.description}
            </p>
          </div>
        </div>
        <Button onClick={handleNewControl} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau contrôle
        </Button>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Historique des contrôles</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {isReceptionControl && (
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className={cn("h-9 w-[200px]", supplierFilter !== 'all' && "border-primary text-primary")}>
                  <SelectValue placeholder="Tous les fournisseurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les fournisseurs</SelectItem>
                  {suppliers?.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2", dateFilter && "border-primary text-primary")}>
                  <Filter className="h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'dd MMM yyyy', { locale: fr }) : 'Filtrer par date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  locale={fr}
                  weekStartsOn={1}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {(dateFilter || (isReceptionControl && supplierFilter !== 'all')) && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDateFilter(undefined); setSupplierFilter('all'); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {currentLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : isStorageControl ? (
          // Storage temperature records display
          filteredStorageRecords && filteredStorageRecords.length > 0 ? (
            <div className="grid gap-3">
              {filteredStorageRecords.map((record) => {
                const statusKey = getStorageStatus(record.is_conforme, record.temperature, record.cold_rooms);
                const status = statusConfig[statusKey];
                const StatusIcon = status.icon;
                
                return (
                  <Card 
                    key={record.id} 
                    onClick={() => setSelectedStorageRecord(record)}
                    className={cn("p-4 border cursor-pointer hover:shadow-md transition-shadow", status.class)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <StatusIcon className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={status.class}>
                              {status.label}
                            </Badge>
                            <span className="text-sm font-medium flex items-center gap-1">
                              <Thermometer className="h-3.5 w-3.5" />
                              {record.temperature}°C
                            </span>
                          </div>
                          {record.cold_rooms && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-sm">
                              <Snowflake className={cn(
                                "h-4 w-4",
                                record.cold_rooms.type === 'negatif' ? 'text-blue-500' : 'text-cyan-500'
                              )} />
                              <span className="font-medium">{record.cold_rooms.name}</span>
                              <span className="text-muted-foreground">
                                ({record.cold_rooms.temp_min}°C à {record.cold_rooms.temp_max}°C)
                              </span>
                            </div>
                          )}
                          {record.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {record.notes}
                            </p>
                          )}
                          {operatorNames?.[record.operator_id] && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span>{operatorNames[record.operator_id]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {format(new Date(record.recorded_at), 'dd MMM yyyy', { locale: fr })}
                          </div>
                          <div className="mt-0.5">
                            {format(new Date(record.recorded_at), 'HH:mm', { locale: fr })}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
              <p className="text-muted-foreground">
                {dateFilter ? `Aucun contrôle pour le ${format(dateFilter, 'dd MMMM yyyy', { locale: fr })}` : 'Aucun contrôle enregistré'}
              </p>
              {dateFilter ? (
                <Button onClick={() => setDateFilter(undefined)} variant="outline" className="mt-4 gap-2">
                  <X className="h-4 w-4" />
                  Retirer le filtre
                </Button>
              ) : (
                <Button onClick={handleNewControl} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Effectuer le premier contrôle
                </Button>
              )}
            </div>
          )
        ) : isProductionControl ? (
          // Production control records display with photos
          filteredRecords && filteredRecords.length > 0 ? (
            <div className="grid gap-4">
              {filteredRecords.map((record) => {
                const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.conforme;
                const StatusIcon = status.icon;
                
                return (
                  <Card 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className={cn("p-4 border cursor-pointer hover:shadow-md transition-shadow", status.class)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <StatusIcon className="h-5 w-5 mt-0.5 shrink-0" />
                          <div>
                            <Badge variant="outline" className={status.class}>
                              {status.label}
                            </Badge>
                            {record.notes && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {record.notes}
                              </p>
                            )}
                            {operatorNames?.[record.operator_id] && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                <span>{operatorNames[record.operator_id]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm text-muted-foreground shrink-0">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {format(new Date(record.timestamp), 'dd MMM yyyy', { locale: fr })}
                            </div>
                            <div className="mt-0.5">
                              {format(new Date(record.timestamp), 'HH:mm', { locale: fr })}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {/* Photos preview */}
                      {record.photos && record.photos.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {record.photos.length} photo{record.photos.length > 1 ? 's' : ''} de lot
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
              <p className="text-muted-foreground">
                {dateFilter ? `Aucun contrôle pour le ${format(dateFilter, 'dd MMMM yyyy', { locale: fr })}` : 'Aucun contrôle enregistré'}
              </p>
              {dateFilter ? (
                <Button onClick={() => setDateFilter(undefined)} variant="outline" className="mt-4 gap-2">
                  <X className="h-4 w-4" />
                  Retirer le filtre
                </Button>
              ) : (
                <Button onClick={handleNewControl} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Effectuer le premier contrôle
                </Button>
              )}
            </div>
          )
        ) : isCP8Control ? (
          // CP8 DLC control records display with product details
          filteredRecords && filteredRecords.length > 0 ? (
            <div className="grid gap-3">
              {filteredRecords.map((record) => {
                const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;
                
                return (
                  <Card 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className={cn("p-4 border cursor-pointer hover:shadow-md transition-shadow", status.class)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <StatusIcon className="h-5 w-5 mt-0.5 shrink-0" />
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={status.class}>
                              {status.label}
                            </Badge>
                          </div>
                          {/* Product details for CP8 */}
                          {record.product && (
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{record.product}</span>
                            </div>
                          )}
                          {record.dlc_date && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span className="text-sm">
                                DLC: <span className="font-medium">{format(new Date(record.dlc_date), 'dd MMMM yyyy', { locale: fr })}</span>
                              </span>
                            </div>
                          )}
                          {record.lot_number && (
                            <p className="text-sm text-muted-foreground">
                              N° de lot: {record.lot_number}
                            </p>
                          )}
                          {record.notes && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {record.notes}
                            </p>
                          )}
                          {operatorNames?.[record.operator_id] && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span>{operatorNames[record.operator_id]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {format(new Date(record.timestamp), 'dd MMM yyyy', { locale: fr })}
                          </div>
                          <div className="mt-0.5">
                            {format(new Date(record.timestamp), 'HH:mm', { locale: fr })}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
              <p className="text-muted-foreground">
                {dateFilter ? `Aucun contrôle pour le ${format(dateFilter, 'dd MMMM yyyy', { locale: fr })}` : 'Aucun contrôle enregistré'}
              </p>
              {dateFilter ? (
                <Button onClick={() => setDateFilter(undefined)} variant="outline" className="mt-4 gap-2">
                  <X className="h-4 w-4" />
                  Retirer le filtre
                </Button>
              ) : (
                <Button onClick={handleNewControl} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Effectuer le premier contrôle
                </Button>
              )}
            </div>
          )
        ) : (
          // Standard control records display
          filteredRecords && filteredRecords.length > 0 ? (
            <div className="grid gap-3">
              {filteredRecords.map((record) => {
                const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;
                
                return (
                  <Card 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className={cn("p-4 border cursor-pointer hover:shadow-md transition-shadow", status.class)}
                  >
                  <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <StatusIcon className="h-5 w-5 mt-0.5 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={status.class}>
                                {status.label}
                              </Badge>
                              {record.temperature !== null && (
                                <span className="text-sm font-medium">
                                  {record.temperature}°C
                                </span>
                              )}
                            </div>
                            {record.notes && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {record.notes}
                              </p>
                            )}
                            {record.product && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Produit: {record.product}
                              </p>
                            )}
                            {record.supplier && (
                              <p className="text-sm text-muted-foreground">
                                Fournisseur: {record.supplier}
                              </p>
                            )}
                            {operatorNames?.[record.operator_id] && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                <span>{operatorNames[record.operator_id]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm text-muted-foreground shrink-0">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {format(new Date(record.timestamp), 'dd MMM yyyy', { locale: fr })}
                            </div>
                            <div className="mt-0.5">
                              {format(new Date(record.timestamp), 'HH:mm', { locale: fr })}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {/* Photos preview for reception controls */}
                      {record.photos && record.photos.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {record.photos.length} photo{record.photos.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
              <p className="text-muted-foreground">
                {dateFilter ? `Aucun contrôle pour le ${format(dateFilter, 'dd MMMM yyyy', { locale: fr })}` : 'Aucun contrôle enregistré'}
              </p>
              {dateFilter ? (
                <Button onClick={() => setDateFilter(undefined)} variant="outline" className="mt-4 gap-2">
                  <X className="h-4 w-4" />
                  Retirer le filtre
                </Button>
              ) : (
                <Button onClick={handleNewControl} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Effectuer le premier contrôle
                </Button>
              )}
            </div>
          )
        )}
      </div>

      {/* Forms */}
      <ControlForm
        controlPoint={controlPoint}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitControl}
      />

      <ReceptionControlForm
        controlPoint={controlPoint}
        isOpen={isReceptionFormOpen}
        onClose={() => setIsReceptionFormOpen(false)}
        onSubmit={handleSubmitReceptionControl}
      />

      <StorageControlForm
        controlPoint={controlPoint}
        isOpen={isStorageFormOpen}
        onClose={() => setIsStorageFormOpen(false)}
        onSubmit={(data: StorageFormData) => {
          setIsStorageFormOpen(false);
        }}
      />

      {/* Production Form - Full page modal */}
      {isProductionFormOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
          <div className="container max-w-2xl mx-auto py-6 px-4">
            <ProductionControlForm
              onSuccess={() => setIsProductionFormOpen(false)}
              onCancel={() => setIsProductionFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Control Detail Modal */}
      <ControlDetailModal
        record={selectedRecord}
        isOpen={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
        onEdit={(record) => {
          setSelectedRecord(null);
          setEditingRecord(record);
        }}
      />

      {/* Control Edit Form */}
      <ControlEditForm
        record={editingRecord}
        isOpen={editingRecord !== null}
        onClose={() => setEditingRecord(null)}
      />

      {/* Storage Record Detail Modal */}
      <StorageRecordDetailModal
        record={selectedStorageRecord}
        isOpen={selectedStorageRecord !== null}
        onClose={() => setSelectedStorageRecord(null)}
        onEdit={(record) => {
          setSelectedStorageRecord(null);
          setEditingStorageRecord(record);
        }}
      />

      {/* Storage Record Edit Form */}
      <StorageRecordEditForm
        record={editingStorageRecord}
        isOpen={editingStorageRecord !== null}
        onClose={() => setEditingStorageRecord(null)}
      />
    </div>
  );
}
