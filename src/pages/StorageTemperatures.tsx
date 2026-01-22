import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Thermometer, TrendingUp, AlertTriangle, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useColdRooms, useStorageTemperatureRecords, ColdRoom } from '@/hooks/useColdRooms';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const chartConfig = {
  temperature: {
    label: "Température",
    color: "hsl(var(--primary))",
  },
  min: {
    label: "Min acceptable",
    color: "hsl(var(--chart-2))",
  },
  max: {
    label: "Max acceptable",
    color: "hsl(var(--destructive))",
  },
};

export default function StorageTemperatures() {
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [period, setPeriod] = useState<string>('7');
  
  const { data: coldRooms, isLoading: roomsLoading } = useColdRooms();
  
  // Fetch temperature records with date filter
  const { data: temperatureRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['storage_temperature_records_history', selectedRoom, period],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      let query = supabase
        .from('storage_temperature_records')
        .select(`
          *,
          cold_room:cold_rooms(name, temp_min, temp_max, type)
        `)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false });
      
      if (selectedRoom !== 'all') {
        query = query.eq('cold_room_id', selectedRoom);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Prepare chart data
  const getChartData = (roomId: string) => {
    if (!temperatureRecords) return [];
    
    const roomRecords = selectedRoom === 'all' && roomId 
      ? temperatureRecords.filter(r => r.cold_room_id === roomId)
      : temperatureRecords;
    
    return roomRecords
      .slice()
      .reverse()
      .map(record => ({
        date: format(new Date(record.recorded_at), 'dd/MM HH:mm', { locale: fr }),
        temperature: Number(record.temperature),
        min: record.cold_room?.temp_min,
        max: record.cold_room?.temp_max,
        isConforme: record.is_conforme,
      }));
  };

  // Calculate statistics
  const getStats = () => {
    if (!temperatureRecords || temperatureRecords.length === 0) {
      return { total: 0, conformes: 0, nonConformes: 0, tauxConformite: 0, tempMoyenne: 0 };
    }
    
    const total = temperatureRecords.length;
    const conformes = temperatureRecords.filter(r => r.is_conforme).length;
    const nonConformes = total - conformes;
    const tauxConformite = Math.round((conformes / total) * 100);
    const tempMoyenne = temperatureRecords.reduce((sum, r) => sum + Number(r.temperature), 0) / total;
    
    return { total, conformes, nonConformes, tauxConformite, tempMoyenne };
  };

  const stats = getStats();

  // Export to CSV
  const handleExportCSV = () => {
    if (!temperatureRecords || temperatureRecords.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = ['Date/Heure', 'Chambre Froide', 'Type', 'Température (°C)', 'Min (°C)', 'Max (°C)', 'Conforme', 'Notes'];
    
    const rows = temperatureRecords.map(record => [
      format(new Date(record.recorded_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
      record.cold_room?.name || '',
      record.cold_room?.type || '',
      record.temperature.toString(),
      record.cold_room?.temp_min?.toString() || '',
      record.cold_room?.temp_max?.toString() || '',
      record.is_conforme ? 'Oui' : 'Non',
      record.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `temperatures_stockage_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export audit report
  const handleExportAuditReport = () => {
    if (!temperatureRecords || temperatureRecords.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const reportDate = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr });
    const periodStart = format(subDays(new Date(), parseInt(period)), 'dd/MM/yyyy', { locale: fr });
    const periodEnd = format(new Date(), 'dd/MM/yyyy', { locale: fr });

    let report = `RAPPORT D'AUDIT - SUIVI DES TEMPÉRATURES DE STOCKAGE
========================================================
Généré le: ${reportDate}
Période: ${periodStart} - ${periodEnd}
Établissement: Breadshop SAS

SYNTHÈSE
--------
Nombre total de relevés: ${stats.total}
Relevés conformes: ${stats.conformes}
Relevés non conformes: ${stats.nonConformes}
Taux de conformité: ${stats.tauxConformite}%
Température moyenne: ${stats.tempMoyenne.toFixed(1)}°C

`;

    // Group by cold room
    const roomGroups = new Map<string, typeof temperatureRecords>();
    temperatureRecords.forEach(record => {
      const roomName = record.cold_room?.name || 'Inconnu';
      if (!roomGroups.has(roomName)) {
        roomGroups.set(roomName, []);
      }
      roomGroups.get(roomName)!.push(record);
    });

    roomGroups.forEach((records, roomName) => {
      const roomConformes = records.filter(r => r.is_conforme).length;
      const roomRate = Math.round((roomConformes / records.length) * 100);
      const firstRecord = records[0];
      
      report += `\n${roomName.toUpperCase()}
${'-'.repeat(roomName.length)}
Type: ${firstRecord.cold_room?.type || 'N/A'}
Plage acceptable: ${firstRecord.cold_room?.temp_min}°C à ${firstRecord.cold_room?.temp_max}°C
Relevés: ${records.length}
Taux de conformité: ${roomRate}%

Historique des relevés:
`;
      
      records.forEach(record => {
        report += `  ${format(new Date(record.recorded_at), 'dd/MM/yyyy HH:mm')} | ${record.temperature}°C | ${record.is_conforme ? '✓ Conforme' : '✗ NON CONFORME'}${record.notes ? ` | ${record.notes}` : ''}\n`;
      });
    });

    report += `\n\n========================================================
Document généré automatiquement par le système HACCP Breadshop
Ce document fait partie des enregistrements obligatoires pour la certification IFS.
`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_audit_temperatures_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedRoomData = coldRooms?.find(r => r.id === selectedRoom);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Températures de Stockage</h1>
          <p className="text-muted-foreground">Historique et suivi des relevés pour audit IFS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportAuditReport}>
            <Download className="h-4 w-4 mr-2" />
            Rapport Audit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Chambre froide</label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les chambres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les chambres</SelectItem>
                  {coldRooms?.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} ({room.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Période</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Dernières 24h</SelectItem>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Thermometer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Relevés totaux</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux de conformité</p>
                <p className="text-2xl font-bold">{stats.tauxConformite}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Non-conformités</p>
                <p className="text-2xl font-bold">{stats.nonConformes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Thermometer className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temp. moyenne</p>
                <p className="text-2xl font-bold">{stats.tempMoyenne.toFixed(1)}°C</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Temperature Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution des températures
          </CardTitle>
          <CardDescription>
            {selectedRoom === 'all' 
              ? 'Sélectionnez une chambre froide pour voir le graphique détaillé'
              : `${selectedRoomData?.name} - Plage: ${selectedRoomData?.temp_min}°C à ${selectedRoomData?.temp_max}°C`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedRoom === 'all' ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <p>Sélectionnez une chambre froide spécifique pour afficher le graphique</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData(selectedRoom)}>
                  <defs>
                    <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    domain={['auto', 'auto']}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {selectedRoomData && (
                    <>
                      <ReferenceLine 
                        y={selectedRoomData.temp_min} 
                        stroke="hsl(var(--chart-2))" 
                        strokeDasharray="5 5" 
                        label={{ value: `Min: ${selectedRoomData.temp_min}°C`, fill: 'hsl(var(--chart-2))', fontSize: 12 }}
                      />
                      <ReferenceLine 
                        y={selectedRoomData.temp_max} 
                        stroke="hsl(var(--destructive))" 
                        strokeDasharray="5 5"
                        label={{ value: `Max: ${selectedRoomData.temp_max}°C`, fill: 'hsl(var(--destructive))', fontSize: 12 }}
                      />
                    </>
                  )}
                  <Area 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#temperatureGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique des relevés
          </CardTitle>
          <CardDescription>
            {temperatureRecords?.length || 0} enregistrements sur la période sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : !temperatureRecords || temperatureRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun relevé pour cette période
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Chambre Froide</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Température</TableHead>
                    <TableHead className="text-right">Plage</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {temperatureRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.recorded_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>{record.cold_room?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.cold_room?.type === 'refrigere' ? 'Réfrigéré' : 
                           record.cold_room?.type === 'congele' ? 'Congelé' : record.cold_room?.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {record.temperature}°C
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {record.cold_room?.temp_min}°C - {record.cold_room?.temp_max}°C
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.is_conforme ? 'default' : 'destructive'}>
                          {record.is_conforme ? 'Conforme' : 'Non conforme'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
