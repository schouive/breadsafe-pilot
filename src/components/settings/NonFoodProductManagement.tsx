import { useState } from 'react';
import { Package, Plus, Edit2, X, Check, Trash2, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useAllRawMaterials, 
  useCreateRawMaterial, 
  useUpdateRawMaterial, 
  useDeleteRawMaterial,
  useSuppliers,
  RawMaterial 
} from '@/hooks/useSuppliers';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const NON_FOOD_CATEGORIES = [
  { value: 'nettoyage', label: 'Nettoyage' },
  { value: 'emballages', label: 'Emballages' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'consommables', label: 'Consommables' },
  { value: 'autre', label: 'Autre' },
];

const NON_FOOD_UNITS = [
  { value: 'bidon', label: 'Bidon(s)' },
  { value: 'carton', label: 'Carton(s)' },
  { value: 'palette', label: 'Palette(s)' },
  { value: 'piece', label: 'Pièce(s)' },
  { value: 'ramette', label: 'Ramette(s)' },
  { value: 'sac', label: 'Sac(s)' },
  { value: 'seau', label: 'Sceau(x)' },
];

interface NonFoodFormData {
  name: string;
  supplier_id: string;
  category: string;
  unit: string;
  purchase_price: string;
  supplier_reference: string;
  is_active: boolean;
  description: string;
  internal_comment: string;
}

const initialFormData: NonFoodFormData = {
  name: '',
  supplier_id: '',
  category: '',
  unit: 'piece',
  purchase_price: '',
  supplier_reference: '',
  is_active: true,
  description: '',
  internal_comment: '',
};

export function NonFoodProductManagement() {
  const { data: allMaterials, isLoading } = useAllRawMaterials();
  const { data: suppliers } = useSuppliers();
  const createMaterial = useCreateRawMaterial();
  const updateMaterial = useUpdateRawMaterial();
  const deleteMaterial = useDeleteRawMaterial();

  // Filter only non-food products
  const materials = allMaterials?.filter(m => (m as any).type_produit === 'non_alimentaire');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState<NonFoodFormData>(initialFormData);
  const [uploadingFds, setUploadingFds] = useState(false);
  const [fdsUrl, setFdsUrl] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(initialFormData);
    setFdsUrl(null);
  };

  const openEditDialog = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      supplier_id: material.supplier_id || '',
      category: material.category || '',
      unit: material.unit || 'piece',
      purchase_price: material.purchase_price?.toString() || '',
      supplier_reference: material.supplier_reference || '',
      is_active: material.is_active,
      description: material.description || '',
      internal_comment: material.internal_comment || '',
    });
    setFdsUrl(material.fds_url || null);
  };

  const handleFdsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFds(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error } = await supabase.storage
        .from('fds-documents')
        .upload(path, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('fds-documents')
        .getPublicUrl(path);
      
      setFdsUrl(urlData.publicUrl);
    } catch (err) {
      console.error('FDS upload error:', err);
    } finally {
      setUploadingFds(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.supplier_id || !formData.category || !formData.purchase_price) return;
    
    await createMaterial.mutateAsync({
      name: formData.name.trim(),
      type_produit: 'non_alimentaire',
      type: 'ingredient',
      supplier_id: formData.supplier_id || null,
      category: formData.category || null,
      unit: formData.unit || 'piece',
      purchase_unit: formData.unit || 'piece',
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      price_unit: formData.unit || 'piece',
      supplier_reference: formData.supplier_reference || null,
      description: formData.description.trim() || null,
      internal_comment: formData.internal_comment.trim() || null,
      fds_url: fdsUrl,
      order_unit: formData.unit || null,
      // Non-food products don't need these
      requires_cold_storage: false,
      requires_dlc_check: false,
    } as any);
    
    setIsAddOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingMaterial) return;
    
    await updateMaterial.mutateAsync({
      id: editingMaterial.id,
      name: formData.name.trim(),
      supplier_id: formData.supplier_id || null,
      category: formData.category || null,
      unit: formData.unit || 'piece',
      purchase_unit: formData.unit || 'piece',
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      price_unit: formData.unit || 'piece',
      supplier_reference: formData.supplier_reference || null,
      description: formData.description.trim() || null,
      internal_comment: formData.internal_comment.trim() || null,
      fds_url: fdsUrl,
      order_unit: formData.unit || null,
      is_active: formData.is_active,
    } as any);
    
    setEditingMaterial(null);
    resetForm();
  };

  const handleToggleActive = async (material: RawMaterial) => {
    await updateMaterial.mutateAsync({
      id: material.id,
      is_active: !material.is_active,
    });
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    await deleteMaterial.mutateAsync(deletingMaterial.id);
    setDeletingMaterial(null);
  };

  const getCategoryLabel = (value: string | null) => {
    return NON_FOOD_CATEGORIES.find(c => c.value === value)?.label || value || '';
  };

  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nf-name">Nom du produit <span className="text-destructive">*</span></Label>
        <Input
          id="nf-name"
          placeholder="Ex: Détergent sol"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nf-supplier">Fournisseur <span className="text-destructive">*</span></Label>
        <Select 
          value={formData.supplier_id || '_none_'} 
          onValueChange={(value) => setFormData({ ...formData, supplier_id: value === '_none_' ? '' : value })}
        >
          <SelectTrigger id="nf-supplier">
            <SelectValue placeholder="Sélectionnez un fournisseur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none_">
              <span className="text-muted-foreground italic">Aucun fournisseur</span>
            </SelectItem>
            {suppliers?.map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nf-category">Catégorie <span className="text-destructive">*</span></Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger id="nf-category">
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              {NON_FOOD_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nf-unit">Unité <span className="text-destructive">*</span></Label>
          <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
            <SelectTrigger id="nf-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NON_FOOD_UNITS.map(u => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nf-price">Prix unitaire (€) <span className="text-destructive">*</span></Label>
          <Input
            id="nf-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nf-ref">Référence fournisseur <span className="text-destructive">*</span></Label>
          <Input
            id="nf-ref"
            placeholder="REF-001"
            value={formData.supplier_reference}
            onChange={(e) => setFormData({ ...formData, supplier_reference: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nf-desc">Description</Label>
        <Textarea
          id="nf-desc"
          placeholder="Description du produit..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Fiche de Données de Sécurité (FDS)</Label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm">
            <Upload className="h-4 w-4" />
            {uploadingFds ? 'Upload...' : 'Choisir un fichier'}
            <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFdsUpload} />
          </label>
          {fdsUrl && (
            <a href={fdsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
              <FileText className="h-4 w-4" />
              Voir FDS
            </a>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nf-comment">Commentaire interne</Label>
        <Textarea
          id="nf-comment"
          placeholder="Notes internes..."
          value={formData.internal_comment}
          onChange={(e) => setFormData({ ...formData, internal_comment: e.target.value })}
          rows={2}
        />
      </div>

      {editingMaterial && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Statut</p>
            <p className="text-xs text-muted-foreground">Activer/désactiver ce produit</p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Produits non alimentaires</CardTitle>
                <CardDescription>Nettoyage, emballages, maintenance, consommables</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : !materials || materials.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun produit non alimentaire configuré</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un produit
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div 
                  key={material.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    material.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{material.name}</p>
                        {material.category && (
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(material.category)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(material as any).suppliers?.name}
                        {(material as any).supplier_reference && ` • Réf: ${(material as any).supplier_reference}`}
                        {material.purchase_price && ` • ${material.purchase_price}€/${material.unit || 'pce'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={material.is_active ? 'bg-success/10 text-success border-success/30' : ''}
                    >
                      {material.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(material)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(material)}>
                      {material.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingMaterial(material)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un produit non alimentaire</DialogTitle>
            <DialogDescription>Nettoyage, emballages, maintenance ou consommables</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Annuler</Button>
            <Button 
              onClick={handleAdd}
              disabled={createMaterial.isPending || !formData.name.trim() || !formData.supplier_id || !formData.category || !formData.purchase_price}
            >
              {createMaterial.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => { if (!open) { setEditingMaterial(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>Modifiez les informations de ce produit non alimentaire</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMaterial(null); resetForm(); }}>Annuler</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateMaterial.isPending || !formData.name.trim()}
            >
              {updateMaterial.isPending ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMaterial} onOpenChange={(open) => !open && setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingMaterial?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
