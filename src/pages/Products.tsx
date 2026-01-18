import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, FileText, Tag } from 'lucide-react';
import { RecipeManagement } from '@/components/products/RecipeManagement';
import { ProductSheetManagement } from '@/components/products/ProductSheetManagement';

export default function Products() {
  const [activeTab, setActiveTab] = useState('recipes');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produits & Étiquetage</h1>
        <p className="text-muted-foreground mt-1">
          Gérez vos recettes, compositions et fiches produit
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Recettes
          </TabsTrigger>
          <TabsTrigger value="product-sheets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Fiches Produit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes">
          <RecipeManagement />
        </TabsContent>

        <TabsContent value="product-sheets">
          <ProductSheetManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
