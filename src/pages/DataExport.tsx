import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Database,
  CheckCircle2,
  Info,
  BookOpen,
  Link2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useDataExport, ExportFormat } from '@/hooks/useDataExport';
import { EXPORTABLE_TABLES, CALCULATION_FORMULAS, TABLE_RELATIONS } from '@/lib/dataExport';

export default function DataExport() {
  const navigate = useNavigate();
  const {
    isExporting,
    progress,
    exportTable,
    exportMultipleTables,
    exportAllTables,
    exportFormulasDocumentation,
    getTableCount,
    exportableTables,
  } = useDataExport();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Charger le nombre d'enregistrements par table
  useEffect(() => {
    const loadCounts = async () => {
      setLoadingCounts(true);
      const counts: Record<string, number> = {};
      for (const table of exportableTables) {
        counts[table.id] = await getTableCount(table.tableName);
      }
      setTableCounts(counts);
      setLoadingCounts(false);
    };
    loadCounts();
  }, []);

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(exportableTables.map(t => t.id));
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) return;

    if (selectedTables.length === 1) {
      const table = exportableTables.find(t => t.id === selectedTables[0]);
      if (table) await exportTable(table, selectedFormat);
    } else {
      await exportMultipleTables(selectedTables, selectedFormat);
    }
  };

  const handleExportAll = async () => {
    await exportAllTables(selectedFormat);
  };

  const totalSelectedRecords = selectedTables.reduce(
    (sum, id) => sum + (tableCounts[id] || 0),
    0
  );

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileText className="h-4 w-4" />,
    json: <FileJson className="h-4 w-4" />,
    excel: <FileSpreadsheet className="h-4 w-4" />,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Export des données</h1>
            <p className="text-muted-foreground">
              Garantissez la réversibilité de vos données
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          <Database className="h-3 w-3 mr-1" />
          {exportableTables.length} tables disponibles
        </Badge>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="formulas">Formules</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
        </TabsList>

        {/* Onglet Export */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sélection des tables */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Tables à exporter
                    </CardTitle>
                    <CardDescription>
                      Sélectionnez les tables que vous souhaitez exporter
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllTables}>
                      Tout sélectionner
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllTables}>
                      Désélectionner
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {exportableTables.map(table => (
                      <div
                        key={table.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedTables.includes(table.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                        onClick={() => toggleTable(table.id)}
                      >
                        <Checkbox
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{table.name}</span>
                            {table.relations && table.relations.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Link2 className="h-3 w-3 mr-1" />
                                {table.relations.length} relation(s)
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {table.description}
                          </p>
                          <code className="text-xs text-muted-foreground">
                            {table.tableName}
                          </code>
                        </div>
                        <div className="text-right">
                          {loadingCounts ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Badge variant="outline">
                              {tableCounts[table.id] || 0} enregistrements
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Options d'export */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Format d'export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['excel', 'csv', 'json'] as ExportFormat[]).map(format => (
                    <div
                      key={format}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFormat === format
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedFormat(format)}
                    >
                      {formatIcons[format]}
                      <div className="flex-1">
                        <span className="font-medium uppercase">{format}</span>
                        <p className="text-xs text-muted-foreground">
                          {format === 'excel' && 'Fichier Excel avec toutes les tables'}
                          {format === 'csv' && 'Fichiers CSV séparés par table'}
                          {format === 'json' && 'Export structuré complet'}
                        </p>
                      </div>
                      {selectedFormat === format && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tables sélectionnées</span>
                      <span className="font-medium">{selectedTables.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Enregistrements</span>
                      <span className="font-medium">{totalSelectedRecords.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format</span>
                      <span className="font-medium uppercase">{selectedFormat}</span>
                    </div>
                  </div>

                  <Separator />

                  {isExporting && progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Export en cours...</span>
                        <span>{progress.current}/{progress.total}</span>
                      </div>
                      <Progress value={(progress.current / progress.total) * 100} />
                      <p className="text-xs text-muted-foreground">{progress.currentTable}</p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleExport}
                    disabled={selectedTables.length === 0 || isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Export en cours...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Exporter la sélection
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleExportAll}
                    disabled={isExporting}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Export complet
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Téléchargez la documentation des formules de calcul pour recréer les valeurs calculées.
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={exportFormulasDocumentation}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Exporter les formules
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Onglet Formules */}
        <TabsContent value="formulas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Documentation des formules de calcul
              </CardTitle>
              <CardDescription>
                Toutes les formules utilisées pour les calculs de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(CALCULATION_FORMULAS).map(([key, formula]) => (
                  <Card key={key} className="border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{formula.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="bg-muted p-2 rounded font-mono text-sm">
                        {formula.formula}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formula.description}
                      </p>
                      {'example' in formula && formula.example && (
                        <div className="flex items-start gap-2 text-sm">
                          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <Button onClick={exportFormulasDocumentation}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger la documentation complète
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Relations */}
        <TabsContent value="relations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Schéma des relations entre tables
              </CardTitle>
              <CardDescription>
                Structure relationnelle de la base de données pour reconstruire les liens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table source</TableHead>
                    <TableHead>Table cible</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Clé étrangère</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TABLE_RELATIONS.relations.map((relation, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{relation.from}</TableCell>
                      <TableCell className="font-mono text-sm">{relation.to}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{relation.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{relation.foreignKey}</TableCell>
                      <TableCell className="text-muted-foreground">{relation.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Légende des types de relations</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Badge variant="outline" className="mr-2">many-to-one</Badge>
                    Plusieurs enregistrements peuvent référencer un seul enregistrement parent
                  </div>
                  <div>
                    <Badge variant="outline" className="mr-2">one-to-one</Badge>
                    Un enregistrement correspond exactement à un enregistrement dans l'autre table
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagramme visuel */}
          <Card>
            <CardHeader>
              <CardTitle>Diagramme des relations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
{`RELATIONS ENTRE TABLES (ERD)
═══════════════════════════════════════

suppliers ──┬──< raw_materials
            │    (fournit)

recipes ────┬──< recipe_ingredients
            │    (contient)
            │
            ├──< product_sheets
            │    (fiche de)
            │
            └──< label_data
                 (étiquette de)

raw_materials ──< recipe_ingredients
                  (utilisé dans)

product_sheets ──< carton_labels
                   (génère)

cold_rooms ──< storage_temperature_records
               (relevés)

raw_materials ──< control_records
                  (contrôlé)

control_records ──< non_conformities
                    (déclenche)

═══════════════════════════════════════
Légende: ──< = relation one-to-many`}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
