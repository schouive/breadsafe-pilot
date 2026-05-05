import { useState, useEffect } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Thermometer, 
  Package, 
  Calendar,
  AlertTriangle,
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Camera,
  Image as ImageIcon,
  Loader2,
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CameraCapture } from './CameraCapture';
import { useAuth } from '@/hooks/useAuth';
import { useSuppliers, useRawMaterials, RawMaterial } from '@/hooks/useSuppliers';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ReceptionFormData } from '@/hooks/useControlRecords';
import { TemperatureInput } from '@/components/ui/TemperatureInput';
import { supabase } from '@/integrations/supabase/client';
import { useOpenOrdersBySupplier, SupplierOrder, OrderLineWithMaterial } from '@/hooks/useSupplierOrders';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReceptionControlFormProps {
  controlPoint: ControlPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceptionFormData) => void;
}

export function ReceptionControlForm({ controlPoint, isOpen, onClose, onSubmit }: ReceptionControlFormProps) {
  const { user } = useAuth();
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const [expandedSection, setExpandedSection] = useState<string | null>('cp1');
  
  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedRawMaterialIds, setSelectedRawMaterialIds] = useState<string[]>([]);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [linkedOrderNumber, setLinkedOrderNumber] = useState<string | null>(null);
  
  // Fetch raw materials for selected supplier
  const { data: rawMaterials, isLoading: loadingRawMaterials } = useRawMaterials(selectedSupplierId);
  
  // Fetch open orders for selected supplier
  const { data: openOrders, isLoading: loadingOrders } = useOpenOrdersBySupplier(selectedSupplierId || undefined);
  
  // CP1 - Temperature
  const [temperature, setTemperature] = useState('');
  const [temperatureConforme, setTemperatureConforme] = useState(true);
  
  // CP2 - Integrity
  const [integriteConforme, setIntegriteConforme] = useState(true);
  const [integriteNotes, setIntegriteNotes] = useState('');
  
  // CP3 - DLC
  const [dlcDate, setDlcDate] = useState('');
  const [dlcConforme, setDlcConforme] = useState(true);
  const [dlcNotes, setDlcNotes] = useState('');
  
  // CP4 - Allergens
  const [allergenesConformes, setAllergenesConformes] = useState(true);
  const [allergenesNotes, setAllergenesNotes] = useState('');
  
  // Common
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [dialogHiddenForCamera, setDialogHiddenForCamera] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Handle camera open - hide dialog first to avoid focus trap interference
  const handleOpenCamera = () => {
    setDialogHiddenForCamera(true);
    // Small delay to let dialog close animation complete
    setTimeout(() => {
      setShowCamera(true);
    }, 50);
  };

  // Handle camera close - restore dialog
  const handleCloseCamera = () => {
    setShowCamera(false);
    setDialogHiddenForCamera(false);
  };

  // Handle photos confirmed
  const handlePhotosConfirmed = (urls: string[]) => {
    setPhotos([...photos, ...urls]);
    setShowCamera(false);
    setDialogHiddenForCamera(false);
  };

  // Reset raw materials and linked order when supplier changes
  useEffect(() => {
    setSelectedRawMaterialIds([]);
    setLinkedOrderId(null);
    setLinkedOrderNumber(null);
  }, [selectedSupplierId]);

  // Handle selecting an open order → pre-fill raw materials
  const handleSelectOrder = (order: SupplierOrder & { supplier_order_lines: OrderLineWithMaterial[] }) => {
    setLinkedOrderId(order.id);
    setLinkedOrderNumber(order.order_number);
    const materialIds = order.supplier_order_lines
      .map((ol) => ol.raw_material_id)
      .filter((id) => rawMaterials?.some((rm) => rm.id === id));
    setSelectedRawMaterialIds(materialIds);
  };

  const handleClearOrder = () => {
    setLinkedOrderId(null);
    setLinkedOrderNumber(null);
    setSelectedRawMaterialIds([]);
  };

  const selectedSupplier = suppliers?.find(s => s.id === selectedSupplierId);
  const selectedRawMaterials = rawMaterials?.filter(r => selectedRawMaterialIds.includes(r.id)) || [];

  // Check if any selected raw material requires cold storage
  const requiresTemperatureControl = selectedRawMaterials.some(rm => rm.requires_cold_storage);

  const handleAddRawMaterial = (rawMaterialId: string) => {
    if (!selectedRawMaterialIds.includes(rawMaterialId)) {
      setSelectedRawMaterialIds([...selectedRawMaterialIds, rawMaterialId]);
    }
  };

  const handleRemoveRawMaterial = (rawMaterialId: string) => {
    setSelectedRawMaterialIds(selectedRawMaterialIds.filter(id => id !== rawMaterialId));
  };

  // Calculate overall status - only consider temperature if required
  const calculateStatus = (): ControlStatus => {
    const tempOk = requiresTemperatureControl ? temperatureConforme : true;
    const allConforme = tempOk && integriteConforme && dlcConforme && allergenesConformes;
    const anyNonConforme = (requiresTemperatureControl && !temperatureConforme) || !integriteConforme || !dlcConforme || !allergenesConformes;
    
    if (allConforme) return 'conforme';
    if (anyNonConforme) return 'nonconforme';
    return 'acceptable';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplierId || selectedRawMaterialIds.length === 0) {
      toast.error('Veuillez sélectionner le fournisseur et au moins un produit');
      return;
    }

    const status = calculateStatus();

    // Build linked order lines if an order is selected
    const matchedOrder = linkedOrderId ? openOrders?.find((o) => o.id === linkedOrderId) : null;
    const linkedOrderLines = matchedOrder
      ? matchedOrder.supplier_order_lines
          .filter((ol) => selectedRawMaterialIds.includes(ol.raw_material_id))
          .map((ol) => ({
            raw_material_id: ol.raw_material_id,
            quantity_ordered: ol.quantity_ordered,
            unit: ol.unit,
            order_line_id: ol.id,
          }))
      : undefined;

    onSubmit({
      status,
      rawMaterialIds: selectedRawMaterialIds,
      products: selectedRawMaterials.map(r => r.name),
      supplierId: selectedSupplierId,
      supplier: selectedSupplier?.name || '',
      temperature: temperature ? parseFloat(temperature) : undefined,
      temperatureConforme,
      integriteConforme,
      integriteNotes: integriteNotes || undefined,
      dlcDate: dlcDate || undefined,
      dlcConforme,
      dlcNotes: dlcNotes || undefined,
      allergenesConformes,
      allergenesNotes: allergenesNotes || undefined,
      notes: notes || undefined,
      photos,
      linkedOrderId: linkedOrderId || null,
      linkedOrderLines,
    });

    // Reset form
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedSupplierId('');
    setSelectedRawMaterialIds([]);
    setLinkedOrderId(null);
    setLinkedOrderNumber(null);
    setTemperature('');
    setTemperatureConforme(true);
    setIntegriteConforme(true);
    setIntegriteNotes('');
    setDlcDate('');
    setDlcConforme(true);
    setDlcNotes('');
    setAllergenesConformes(true);
    setAllergenesNotes('');
    setNotes('');
    setPhotos([]);
    setExpandedSection('cp1');
  };

  if (!controlPoint) return null;

  return (
    <>
    {/* Dialog is hidden when camera is open to avoid focus trap interference */}
    <Dialog open={isOpen && !dialogHiddenForCamera} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {controlPoint.name}
          </DialogTitle>
          <DialogDescription>
            {controlPoint.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product info section */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Informations Produit
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Fournisseur *</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSuppliers ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : suppliers?.length === 0 ? (
                      <SelectItem value="none" disabled>Aucun fournisseur configuré</SelectItem>
                    ) : (
                      suppliers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Open orders section - shown after supplier is selected */}
              {selectedSupplierId && (
                <div className="space-y-2">
                  {linkedOrderNumber ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Commande {linkedOrderNumber}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearOrder}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Délier
                      </Button>
                    </div>
                  ) : (
                    <>
                      {loadingOrders ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg border">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Recherche de commandes...</span>
                        </div>
                      ) : openOrders && openOrders.length > 0 ? (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Commandes en cours (optionnel)</Label>
                          {openOrders.map((order) => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => handleSelectOrder(order)}
                              className="w-full flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium text-xs">{order.order_number}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(order.order_date), 'dd/MM/yy', { locale: fr })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {order.status === 'sent' ? 'Envoyée' : 'Partielle'}
                                </Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="product">Produits * (sélection multiple)</Label>
                <Select 
                  value="" 
                  onValueChange={handleAddRawMaterial}
                  disabled={!selectedSupplierId}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder={selectedSupplierId ? "Ajouter un produit" : "Sélectionnez d'abord un fournisseur"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingRawMaterials ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : rawMaterials?.length === 0 ? (
                      <SelectItem value="none" disabled>Aucun produit pour ce fournisseur</SelectItem>
                    ) : (
                      rawMaterials?.filter(r => !selectedRawMaterialIds.includes(r.id)).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.category && `(${r.category})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {/* Selected products */}
                {selectedRawMaterials.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRawMaterials.map((rm) => (
                      <Badge 
                        key={rm.id} 
                        variant="secondary" 
                        className="flex items-center gap-1 pr-1"
                      >
                        {rm.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveRawMaterial(rm.id)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photo capture - moved here after product info */}
          {user && (
            <div className="space-y-4">
              {/* Already uploaded photos */}
              {photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Photos enregistrées</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div 
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                      >
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload buttons */}
              {photos.length < 5 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 touch-target"
                    onClick={handleOpenCamera}
                    disabled={uploading}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Appareil photo
                  </Button>
                </div>
              )}

              {/* Photo count */}
              <p className="text-xs text-muted-foreground text-center">
                {photos.length} / 5 photos enregistrées
              </p>
            </div>
          )}

          <Separator />

          {/* CP1 - Temperature - Only show if raw materials require cold storage */}
          {requiresTemperatureControl && (
            <Collapsible 
              open={expandedSection === 'cp1'} 
              onOpenChange={() => setExpandedSection(expandedSection === 'cp1' ? null : 'cp1')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Thermometer className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">CP1 - Température</p>
                    <p className="text-xs text-muted-foreground">Contrôle température à réception</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {temperatureConforme ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  {expandedSection === 'cp1' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Température mesurée (°C)</Label>
                  <TemperatureInput
                    value={temperature}
                    onChange={setTemperature}
                    placeholder="Ex: 3.5"
                    inputClassName="text-lg h-12"
                  />
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border">
                  <Checkbox 
                    id="temp-conforme"
                    checked={temperatureConforme}
                    onCheckedChange={(checked) => setTemperatureConforme(checked as boolean)}
                  />
                  <Label htmlFor="temp-conforme" className="flex-1 cursor-pointer">
                    Température conforme à l'étiquetage
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Acceptable: jusqu'à 3°C de plus en surface pour réfrigéré
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* CP2 - Integrity */}
          <Collapsible 
            open={expandedSection === 'cp2'} 
            onOpenChange={() => setExpandedSection(expandedSection === 'cp2' ? null : 'cp2')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">CP2 - Intégrité</p>
                  <p className="text-xs text-muted-foreground">Vérification emballages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integriteConforme ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {expandedSection === 'cp2' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox 
                  id="integrite-conforme"
                  checked={integriteConforme}
                  onCheckedChange={(checked) => setIntegriteConforme(checked as boolean)}
                />
                <Label htmlFor="integrite-conforme" className="flex-1 cursor-pointer">
                  Emballage propre et non percé
                </Label>
              </div>
              {!integriteConforme && (
                <div className="space-y-2">
                  <Label htmlFor="integrite-notes">Observations</Label>
                  <Textarea
                    id="integrite-notes"
                    placeholder="Décrivez le problème..."
                    value={integriteNotes}
                    onChange={(e) => setIntegriteNotes(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* CP3 - DLC */}
          <Collapsible 
            open={expandedSection === 'cp3'} 
            onOpenChange={() => setExpandedSection(expandedSection === 'cp3' ? null : 'cp3')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">CP3 - DLC</p>
                  <p className="text-xs text-muted-foreground">Dates limites de consommation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dlcConforme ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {expandedSection === 'cp3' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dlc-date">Date limite de consommation</Label>
                <Input
                  id="dlc-date"
                  type="date"
                  value={dlcDate}
                  onChange={(e) => setDlcDate(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox 
                  id="dlc-conforme"
                  checked={dlcConforme}
                  onCheckedChange={(checked) => setDlcConforme(checked as boolean)}
                />
                <Label htmlFor="dlc-conforme" className="flex-1 cursor-pointer">
                  DLC suffisante (≥2 sem œuf/beurre, ≥1 mois margarine/levure)
                </Label>
              </div>
              {!dlcConforme && (
                <div className="space-y-2">
                  <Label htmlFor="dlc-notes">Observations</Label>
                  <Textarea
                    id="dlc-notes"
                    placeholder="Produit consommable avant péremption ?"
                    value={dlcNotes}
                    onChange={(e) => setDlcNotes(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* CP4 - Allergens */}
          <Collapsible 
            open={expandedSection === 'cp4'} 
            onOpenChange={() => setExpandedSection(expandedSection === 'cp4' ? null : 'cp4')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">CP4 - Allergènes</p>
                  <p className="text-xs text-muted-foreground">Vérification composition</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {allergenesConformes ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {expandedSection === 'cp4' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
              {/* Composition de référence des MP (multi-ingrédients) */}
              {(() => {
                const mpWithComposition = selectedRawMaterials.filter(
                  (rm) => rm.composition && rm.composition.trim().length > 0 && /[,;]/.test(rm.composition)
                );
                if (mpWithComposition.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Composition enregistrée (à comparer avec l'emballage)
                    </Label>
                    <div className="space-y-2">
                      {mpWithComposition.map((rm) => (
                        <div
                          key={rm.id}
                          className="p-3 rounded-lg border bg-accent/30 space-y-1"
                        >
                          <p className="text-sm font-medium text-foreground">{rm.name}</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {rm.composition}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox 
                  id="allergenes-conforme"
                  checked={allergenesConformes}
                  onCheckedChange={(checked) => setAllergenesConformes(checked as boolean)}
                />
                <Label htmlFor="allergenes-conforme" className="flex-1 cursor-pointer">
                  Composition conforme à la référence
                </Label>
              </div>
              {!allergenesConformes && (
                <div className="space-y-2">
                  <Label htmlFor="allergenes-notes">Observations</Label>
                  <Textarea
                    id="allergenes-notes"
                    placeholder="Détaillez le changement de composition..."
                    value={allergenesNotes}
                    onChange={(e) => setAllergenesNotes(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observations générales (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Remarques supplémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>


          {/* Status summary */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            calculateStatus() === 'conforme' && "bg-success/10 border-success/30",
            calculateStatus() === 'acceptable' && "bg-warning/10 border-warning/30",
            calculateStatus() === 'nonconforme' && "bg-destructive/10 border-destructive/30"
          )}>
            <div className="flex items-center gap-3">
              {calculateStatus() === 'conforme' && <CheckCircle2 className="h-6 w-6 text-success" />}
              {calculateStatus() === 'acceptable' && <AlertCircle className="h-6 w-6 text-warning" />}
              {calculateStatus() === 'nonconforme' && <XCircle className="h-6 w-6 text-destructive" />}
              <div>
                <p className="font-medium">
                  Statut: {calculateStatus() === 'conforme' ? 'Conforme' : 
                           calculateStatus() === 'acceptable' ? 'Acceptable' : 'Non-conforme'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {calculateStatus() === 'conforme' && 'Tous les contrôles sont conformes'}
                  {calculateStatus() === 'acceptable' && 'Certains contrôles nécessitent une attention'}
                  {calculateStatus() === 'nonconforme' && 'Action corrective requise'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="touch-target">
              Annuler
            </Button>
            <Button type="submit" className="touch-target">
              Enregistrer le contrôle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Fullscreen camera - rendered OUTSIDE Dialog, Dialog is hidden when camera is active */}
    {showCamera && user && (
      <CameraCapture
        onPhotosConfirmed={handlePhotosConfirmed}
        onClose={handleCloseCamera}
        userId={user.id}
        maxPhotos={5}
        existingPhotosCount={photos.length}
      />
    )}
  </>
  );
}
