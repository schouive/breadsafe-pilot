import { useState } from 'react';
import { Truck, Plus, Edit2, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useAllSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, Supplier } from '@/hooks/useSuppliers';
import { cn } from '@/lib/utils';

export function SupplierManagement() {
  const { data: suppliers, isLoading } = useAllSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    email2: '',
    phone: '',
    address: '',
    order_email: '',
    client_code: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      email: '',
      email2: '',
      phone: '',
      address: '',
      order_email: '',
      client_code: '',
    });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    
    await createSupplier.mutateAsync({
      name: formData.name.trim(),
      contact_name: formData.contact_name.trim() || null,
      email: formData.email.trim() || null,
      email2: formData.email2.trim() || null,
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      order_email: formData.order_email.trim() || null,
      client_code: formData.client_code.trim() || null,
    });
    
    setIsAddOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingSupplier) return;
    
    await updateSupplier.mutateAsync({
      id: editingSupplier.id,
      name: editingSupplier.name,
      contact_name: editingSupplier.contact_name,
      email: editingSupplier.email,
      email2: editingSupplier.email2,
      phone: editingSupplier.phone,
      address: editingSupplier.address,
      order_email: editingSupplier.order_email,
      client_code: editingSupplier.client_code,
    });
    
    setEditingSupplier(null);
  };

  const handleToggleActive = async (supplier: Supplier) => {
    await updateSupplier.mutateAsync({
      id: supplier.id,
      is_active: !supplier.is_active,
    });
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier({ ...supplier });
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    await deleteSupplier.mutateAsync(deletingSupplier.id);
    setDeletingSupplier(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Fournisseurs</CardTitle>
                <CardDescription>Gérez vos fournisseurs de matières premières</CardDescription>
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
          ) : suppliers?.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun fournisseur configuré</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un fournisseur
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers?.map((supplier) => (
                <div 
                  key={supplier.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    supplier.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {supplier.contact_name && `${supplier.contact_name} • `}
                        {supplier.email || supplier.phone || 'Pas de contact'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={supplier.is_active ? 'bg-success/10 text-success border-success/30' : ''}
                    >
                      {supplier.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(supplier)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleActive(supplier)}
                    >
                      {supplier.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingSupplier(supplier)}
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
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un fournisseur</DialogTitle>
            <DialogDescription>
              Enregistrez un nouveau fournisseur de matières premières
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Nom *</Label>
              <Input
                id="supplier-name"
                placeholder="Ex: Minoterie Dupont"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nom du contact</Label>
              <Input
                id="contact-name"
                placeholder="Ex: Jean Dupont"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@fournisseur.fr"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  placeholder="01 23 45 67 89"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="123 rue de l'Industrie, 75000 Paris"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-email">Email de commande</Label>
              <Input
                id="order-email"
                type="email"
                placeholder="commandes@fournisseur.fr"
                value={formData.order_email}
                onChange={(e) => setFormData({ ...formData, order_email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Adresse email dédiée pour l'envoi des commandes</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={createSupplier.isPending || !formData.name.trim()}
            >
              {createSupplier.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le fournisseur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de ce fournisseur
            </DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-supplier-name">Nom *</Label>
                <Input
                  id="edit-supplier-name"
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact-name">Nom du contact</Label>
                <Input
                  id="edit-contact-name"
                  value={editingSupplier.contact_name || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contact_name: e.target.value || null })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingSupplier.email || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Téléphone</Label>
                  <Input
                    id="edit-phone"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <Input
                  id="edit-address"
                  value={editingSupplier.address || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-order-email">Email de commande</Label>
                <Input
                  id="edit-order-email"
                  type="email"
                  value={editingSupplier.order_email || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, order_email: e.target.value || null })}
                />
                <p className="text-xs text-muted-foreground">Adresse email dédiée pour l'envoi des commandes</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSupplier(null)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateSupplier.isPending}
            >
              {updateSupplier.isPending ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSupplier} onOpenChange={(open) => !open && setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingSupplier?.name}</strong> ? 
              Cette action est irréversible. Les matières premières associées ne seront pas supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSupplier.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
