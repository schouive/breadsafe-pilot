import { useState } from 'react';
import { 
  History, 
  User, 
  FileText, 
  Shield, 
  ChevronDown,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  update_user_role: { label: 'Modification de rôle', color: 'bg-blue-100 text-blue-700' },
  activate_user: { label: 'Activation utilisateur', color: 'bg-green-100 text-green-700' },
  deactivate_user: { label: 'Désactivation utilisateur', color: 'bg-red-100 text-red-700' },
  create: { label: 'Création', color: 'bg-green-100 text-green-700' },
  update: { label: 'Modification', color: 'bg-blue-100 text-blue-700' },
  delete: { label: 'Suppression', color: 'bg-red-100 text-red-700' },
  validate: { label: 'Validation', color: 'bg-purple-100 text-purple-700' },
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  recipe: 'Recette',
  product_sheet: 'Fiche produit',
  non_conformity: 'Non-conformité',
  control_record: 'Contrôle',
  supplier: 'Fournisseur',
  raw_material: 'Matière première',
};

export function AuditLogViewer() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const { data: logs, isLoading } = useAuditLogs({
    entityType: entityFilter !== 'all' ? entityFilter : undefined,
    limit: 50,
  });

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getActionInfo = (action: string) => {
    return ACTION_LABELS[action] || { label: action, color: 'bg-gray-100 text-gray-700' };
  };

  const getEntityLabel = (entityType: string) => {
    return ENTITY_LABELS[entityType] || entityType;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Journal d'audit</CardTitle>
              <CardDescription>Historique des actions sensibles</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="user">Utilisateurs</SelectItem>
                <SelectItem value="recipe">Recettes</SelectItem>
                <SelectItem value="product_sheet">Fiches produits</SelectItem>
                <SelectItem value="non_conformity">Non-conformités</SelectItem>
                <SelectItem value="control_record">Contrôles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : logs?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune action enregistrée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs?.map((log) => {
              const actionInfo = getActionInfo(log.action);
              const isExpanded = expandedLogs.has(log.id);
              const hasDetails = log.old_values || log.new_values;

              return (
                <Collapsible key={log.id} open={isExpanded} onOpenChange={() => hasDetails && toggleExpanded(log.id)}>
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild disabled={!hasDetails}>
                      <div 
                        className={cn(
                          "flex items-center justify-between p-3 transition-colors",
                          hasDetails && "hover:bg-muted/50 cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{log.user_name}</span>
                              <Badge variant="outline" className={cn("text-xs border-0", actionInfo.color)}>
                                {actionInfo.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getEntityLabel(log.entity_type)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                          </div>
                        </div>
                        {hasDetails && (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    {hasDetails && (
                      <CollapsibleContent>
                        <div className="px-4 pb-3 pt-0 border-t bg-muted/30">
                          <div className="grid grid-cols-2 gap-4 pt-3">
                            {log.old_values && (
                              <div>
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Avant</h5>
                                <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Après</h5>
                                <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    )}
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
