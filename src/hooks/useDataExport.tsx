import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  EXPORTABLE_TABLES,
  ExportableTable,
  convertToCSV,
  convertToJSON,
  createExcelWorkbook,
  downloadFile,
  downloadExcel,
  generateFormulasDocumentation,
} from '@/lib/dataExport';

export type ExportFormat = 'csv' | 'json' | 'excel';

export interface ExportProgress {
  current: number;
  total: number;
  currentTable: string;
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  // Récupérer les données d'une table
  const fetchTableData = async (tableName: string): Promise<Record<string, unknown>[]> => {
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(10000); // Limite de sécurité

    if (error) {
      console.error(`Erreur lors de la récupération de ${tableName}:`, error);
      throw new Error(`Erreur: ${tableName} - ${error.message}`);
    }

    return (data || []) as unknown as Record<string, unknown>[];
  };

  // Exporter une seule table
  const exportTable = async (table: ExportableTable, format: ExportFormat): Promise<void> => {
    setIsExporting(true);
    setProgress({ current: 0, total: 1, currentTable: table.name });

    try {
      const data = await fetchTableData(table.tableName);
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `breadsafe_${table.id}_${timestamp}`;

      switch (format) {
        case 'csv': {
          const csv = convertToCSV(data);
          downloadFile(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8');
          break;
        }
        case 'json': {
          const json = convertToJSON(data, table.tableName);
          downloadFile(json, `${baseFilename}.json`, 'application/json');
          break;
        }
        case 'excel': {
          const workbook = createExcelWorkbook([{ name: table.name, data }]);
          downloadExcel(workbook, `${baseFilename}.xlsx`);
          break;
        }
      }

      toast.success(`${table.name} exporté avec succès (${data.length} enregistrements)`);
    } catch (error) {
      toast.error(`Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  // Exporter plusieurs tables
  const exportMultipleTables = async (tableIds: string[], format: ExportFormat): Promise<void> => {
    setIsExporting(true);
    const tables = EXPORTABLE_TABLES.filter(t => tableIds.includes(t.id));
    const timestamp = new Date().toISOString().split('T')[0];

    try {
      const allData: { name: string; tableName: string; data: Record<string, unknown>[] }[] = [];

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        setProgress({ current: i + 1, total: tables.length, currentTable: table.name });
        
        const data = await fetchTableData(table.tableName);
        allData.push({ name: table.name, tableName: table.tableName, data });
      }

      switch (format) {
        case 'csv': {
          // Pour CSV, on crée un fichier ZIP ou on télécharge chaque fichier
          for (const tableData of allData) {
            const csv = convertToCSV(tableData.data);
            downloadFile(csv, `breadsafe_${tableData.tableName}_${timestamp}.csv`, 'text/csv;charset=utf-8');
          }
          break;
        }
        case 'json': {
          // Export JSON global
          const fullExport = {
            application: 'BreadSafe',
            exportDate: new Date().toISOString(),
            version: '1.0',
            tables: allData.reduce((acc, t) => {
              acc[t.tableName] = {
                name: t.name,
                recordCount: t.data.length,
                data: t.data,
              };
              return acc;
            }, {} as Record<string, unknown>),
          };
          downloadFile(
            JSON.stringify(fullExport, null, 2),
            `breadsafe_export_complet_${timestamp}.json`,
            'application/json'
          );
          break;
        }
        case 'excel': {
          const workbook = createExcelWorkbook(allData);
          downloadExcel(workbook, `breadsafe_export_complet_${timestamp}.xlsx`);
          break;
        }
      }

      const totalRecords = allData.reduce((sum, t) => sum + t.data.length, 0);
      toast.success(`Export terminé: ${tables.length} tables, ${totalRecords} enregistrements`);
    } catch (error) {
      toast.error(`Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  // Exporter toutes les tables
  const exportAllTables = async (format: ExportFormat): Promise<void> => {
    const allTableIds = EXPORTABLE_TABLES.map(t => t.id);
    await exportMultipleTables(allTableIds, format);
  };

  // Exporter la documentation des formules
  const exportFormulasDocumentation = (): void => {
    const doc = generateFormulasDocumentation();
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(doc, `breadsafe_formules_${timestamp}.txt`, 'text/plain;charset=utf-8');
    toast.success('Documentation des formules exportée');
  };

  // Obtenir un aperçu des données d'une table
  const getTablePreview = async (tableName: string, limit = 5): Promise<Record<string, unknown>[]> => {
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(limit);

    if (error) {
      console.error(`Erreur aperçu ${tableName}:`, error);
      return [];
    }

    return (data || []) as unknown as Record<string, unknown>[];
  };

  // Obtenir le nombre d'enregistrements d'une table
  const getTableCount = async (tableName: string): Promise<number> => {
    const { count, error } = await supabase
      .from(tableName as any)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`Erreur comptage ${tableName}:`, error);
      return 0;
    }

    return count || 0;
  };

  return {
    isExporting,
    progress,
    exportTable,
    exportMultipleTables,
    exportAllTables,
    exportFormulasDocumentation,
    getTablePreview,
    getTableCount,
    exportableTables: EXPORTABLE_TABLES,
  };
}
