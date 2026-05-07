import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Printer, Search, ArrowLeft, Star, History, Check, Loader2,
} from 'lucide-react';
import {
  usePrintProducts, usePrintHistory,
  usePrintFavorites, useToggleFavorite, useRecordPrint,
  type PrintProduct,
} from '@/hooks/usePrintLabels';
import { cn } from '@/lib/utils';

const FAMILIES = ['BUN', 'BAG', 'HDG', 'PDM', 'PLQ', 'SPC'];

const PACKAGING_LABELS: Record<string, string> = {
  U01: 'Unité',
  C05: 'Carton de 5',
  C24: 'Carton de 24',
  PAL: 'Palette',
};

export default function PrintLabels() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<PrintProduct | null>(null);
  const [lot, setLot] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [ddm, setDdm] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [printing, setPrinting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const lotRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading: loadingProducts } = usePrintProducts();
  const { data: history = [] } = usePrintHistory(10);
  const { data: favorites = [] } = usePrintFavorites();
  const toggleFav = useToggleFavorite();
  const recordPrint = useRecordPrint();

  useEffect(() => {
    if (step === 2) setTimeout(() => lotRef.current?.focus(), 100);
  }, [step]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (familyFilter) list = list.filter(p => p.family === familyFilter);
    if (showFavoritesOnly) list = list.filter(p => favorites.includes(p.id));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.erp_code.toLowerCase().includes(q) ||
        p.sku_base.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        p.erp_label.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 80);
  }, [products, search, familyFilter, showFavoritesOnly, favorites]);

  const finalSku = selected
    ? `${selected.sku_base}-${selected.temperature}-${selected.slicing}-${selected.packaging}`
    : '';

  const reset = () => {
    setStep(1);
    setSelected(null);
    setLot(''); setDdm(''); setQuantity('1');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleQuickReprint = (h: typeof history[number]) => {
    const product = products.find(p => p.id === h.product_id);
    if (!product) {
      toast.error('Article ERP introuvable ou désactivé');
      return;
    }
    setSelected(product);
    setLot(h.lot_number);
    setDdm(h.ddm);
    setQuantity(String(h.quantity));
    setStep(3);
  };

  const handlePrint = async () => {
    if (!selected || !lot.trim() || !ddm || Number(quantity) < 1) {
      toast.error('Informations manquantes');
      return;
    }
    if (!selected.template_name) {
      toast.error('Aucun template Zebra associé à cet article');
      return;
    }
    setPrinting(true);
    try {
      console.log('[print-label]', {
        erp_code: selected.erp_code,
        final_sku: finalSku,
        template: selected.template_name,
        lot, ddm, quantity: Number(quantity),
      });

      await recordPrint.mutateAsync({
        product_id: selected.id,
        final_sku: finalSku,
        sku_base: selected.sku_base,
        old_code: selected.erp_code,
        temperature: selected.temperature,
        slicing: selected.slicing,
        packaging: selected.packaging,
        template_name: selected.template_name,
        lot_number: lot,
        ddm,
        quantity: Number(quantity),
      });
      toast.success(`${quantity} étiquette(s) envoyée(s) à l'imprimante`);
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur impression');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Printer className="h-8 w-8" />
            Impression Étiquettes Production
          </h1>
          <p className="text-muted-foreground mt-1">
            Étape {step}/3 — {['Article', 'Lot & DDM', 'Confirmation'][step - 1]}
          </p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="lg" onClick={reset}>
            <ArrowLeft className="h-5 w-5 mr-2" /> Recommencer
          </Button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* ÉTAPE 1 */}
      {step === 1 && (
        <div className="space-y-4">
          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Réimpression rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {history.slice(0, 10).map(h => (
                  <Button
                    key={h.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickReprint(h)}
                    className="font-mono text-xs"
                  >
                    {h.final_sku} · L:{h.lot_number}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher code ERP, SKU, libellé, famille…"
                  className="pl-11 h-14 text-lg"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant={showFavoritesOnly ? 'default' : 'outline'}
                  onClick={() => setShowFavoritesOnly(v => !v)}
                >
                  <Star className="h-4 w-4 mr-1" /> Favoris
                </Button>
                <Button
                  size="sm"
                  variant={!familyFilter ? 'default' : 'outline'}
                  onClick={() => setFamilyFilter(null)}
                >
                  Toutes
                </Button>
                {FAMILIES.map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={familyFilter === f ? 'default' : 'outline'}
                    onClick={() => setFamilyFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground p-8">
                  Aucun article actif. Activez des articles dans Paramètres → Catalogue d'impression.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map(p => {
                    const isFav = favorites.includes(p.id);
                    return (
                      <Card key={p.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm font-bold text-primary truncate">
                                {p.erp_code}
                              </p>
                              <p className="text-sm font-medium leading-tight mt-1">
                                {p.erp_label}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              onClick={() => toggleFav.mutate({ productId: p.id, isFav })}
                            >
                              <Star className={cn('h-4 w-4', isFav && 'fill-amber-400 text-amber-400')} />
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline">{PACKAGING_LABELS[p.packaging] ?? p.packaging}</Badge>
                            {!p.template_name && (
                              <Badge variant="destructive" className="text-xs">Sans template</Badge>
                            )}
                          </div>
                          <Button
                            className="w-full"
                            size="lg"
                            disabled={!p.template_name}
                            onClick={() => { setSelected(p); setStep(2); }}
                          >
                            Sélectionner
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ÉTAPE 2 */}
      {step === 2 && selected && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de lot</CardTitle>
            <p className="font-mono text-sm text-muted-foreground mt-1">
              {selected.erp_code} — {selected.erp_label}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lot">Numéro de lot *</Label>
              <Input
                id="lot" ref={lotRef}
                value={lot}
                onChange={e => setLot(e.target.value)}
                placeholder="Scanner ou saisir le lot"
                className="h-14 text-lg font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ddm">DDM *</Label>
              <Input id="ddm" type="date" value={ddm}
                onChange={e => setDdm(e.target.value)}
                className="h-14 text-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantité d'étiquettes *</Label>
              <Input id="qty" type="number" min={1} value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="h-14 text-lg" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
                Retour
              </Button>
              <Button size="lg" className="flex-1"
                disabled={!lot.trim() || !ddm || Number(quantity) < 1}
                onClick={() => setStep(3)}>
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ÉTAPE 3 */}
      {step === 3 && selected && (
        <Card className="border-primary border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-6 w-6 text-primary" />
              Confirmation avant impression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow label="Article" value={`${selected.erp_code} — ${selected.erp_label}`} />
            <SummaryRow label="SKU final" value={finalSku} mono />
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryRow label="Température" value={selected.temperature === 'FR' ? 'Frais' : 'Surgelé'} />
              <SummaryRow label="Finition" value={selected.slicing === 'SLI' ? 'Tranché' : 'Non tranché'} />
              <SummaryRow label="Conditionnement" value={PACKAGING_LABELS[selected.packaging]} />
              <SummaryRow label="Lot" value={lot} mono />
              <SummaryRow label="DDM" value={new Date(ddm).toLocaleDateString('fr-FR')} />
              <SummaryRow label="Quantité" value={`${quantity} étiquette(s)`} />
            </div>

            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
                  Données étiquette (depuis fiche technique)
                </h3>
                {selected.inco_status && (
                  <Badge variant={selected.inco_status === 'validated' ? 'default' : 'destructive'}>
                    INCO {selected.inco_status === 'validated' ? 'validé' : selected.inco_status}
                  </Badge>
                )}
              </div>

              <LabelDataBlock
                title="Désignation produit"
                content={selected.product_name || selected.erp_label}
              />
              <LabelDataBlock
                title="Poids net"
                content={selected.net_weight ? `${selected.net_weight} ${selected.net_weight_unit || 'g'}` : null}
              />
              <LabelDataBlock
                title="Liste des ingrédients (INCO)"
                html={selected.ingredients_html}
              />
              <LabelDataBlock
                title="Allergènes"
                content={selected.allergen_statement}
              />
              <LabelDataBlock
                title="Conservation"
                content={selected.storage_instructions}
              />
              {selected.thawing_instructions && (
                <LabelDataBlock
                  title="Décongélation"
                  content={selected.thawing_instructions}
                />
              )}
              <LabelDataBlock title="Valeurs nutritionnelles / 100 g">
                {selected.nutrition ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                    <NutriRow label="Énergie" value={
                      selected.nutrition.energyKj || selected.nutrition.energyKcal
                        ? `${selected.nutrition.energyKj ?? '—'} kJ / ${selected.nutrition.energyKcal ?? '—'} kcal`
                        : null
                    } />
                    <NutriRow label="Matières grasses" value={fmtNutri(selected.nutrition.fat, 'g')} />
                    <NutriRow label="dont AGS" value={fmtNutri(selected.nutrition.saturatedFat, 'g')} />
                    <NutriRow label="Glucides" value={fmtNutri(selected.nutrition.carbohydrates, 'g')} />
                    <NutriRow label="dont sucres" value={fmtNutri(selected.nutrition.sugars, 'g')} />
                    <NutriRow label="Fibres" value={fmtNutri(selected.nutrition.fiber, 'g')} />
                    <NutriRow label="Protéines" value={fmtNutri(selected.nutrition.protein, 'g')} />
                    <NutriRow label="Sel" value={fmtNutri(selected.nutrition.salt, 'g')} />
                  </div>
                ) : (
                  <p className="text-sm text-destructive">Aucune donnée nutritionnelle</p>
                )}
              </LabelDataBlock>
            </div>

            <Separator />
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
              <span className="text-sm text-muted-foreground">Template Zebra</span>
              <Badge variant="default" className="font-mono">{selected.template_name}</Badge>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(2)} className="flex-1">
                Retour
              </Button>
              <Button
                size="lg"
                className="flex-[2] h-16 text-lg"
                onClick={handlePrint}
                disabled={printing}
              >
                {printing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <><Printer className="h-6 w-6 mr-2" /> IMPRIMER</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function fmtNutri(v: number | null | undefined, unit: string) {
  if (v === null || v === undefined) return null;
  return `${Number(v).toFixed(2).replace(/\.?0+$/, '')} ${unit}`;
}

function NutriRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}

function LabelDataBlock({
  title, content, html, children,
}: {
  title: string;
  content?: string | null;
  html?: string | null;
  children?: React.ReactNode;
}) {
  const isMissing = !content && !html && !children;
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        {title}
      </p>
      {children ? (
        children
      ) : html ? (
        <div
          className="text-sm prose prose-sm max-w-none [&>strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : content ? (
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      ) : (
        <p className="text-sm text-destructive italic">⚠ Donnée manquante</p>
      )}
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-base font-semibold', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
