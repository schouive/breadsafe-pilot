import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Printer, Search, ArrowLeft, Star, History, Check, Snowflake,
  Sun, Scissors, Package, Layers, Boxes, Loader2,
} from 'lucide-react';
import {
  usePrintProducts, usePrintVariants, usePrintHistory,
  usePrintFavorites, useToggleFavorite, useRecordPrint,
  type PrintProduct, type PrintVariant,
} from '@/hooks/usePrintLabels';
import { cn } from '@/lib/utils';

type Temperature = 'FR' | 'FZ';
type Slicing = 'SLI' | 'WHO';
type Packaging = 'U01' | 'C05' | 'C24' | 'PAL';

const FAMILIES = ['BUN', 'BAG', 'HDG', 'PDM', 'PLQ', 'SPC'];

const PACKAGING_LABELS: Record<Packaging, string> = {
  U01: 'Unité',
  C05: 'Carton de 5',
  C24: 'Carton de 24',
  PAL: 'Palette',
};

export default function PrintLabels() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PrintProduct | null>(null);
  const [temperature, setTemperature] = useState<Temperature | null>(null);
  const [slicing, setSlicing] = useState<Slicing | null>(null);
  const [packaging, setPackaging] = useState<Packaging | null>(null);
  const [lot, setLot] = useState('');
  const [ddm, setDdm] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [printing, setPrinting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const lotRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading: loadingProducts } = usePrintProducts();
  const { data: variants = [] } = usePrintVariants(selectedProduct?.id);
  const { data: history = [] } = usePrintHistory(10);
  const { data: favorites = [] } = usePrintFavorites();
  const toggleFav = useToggleFavorite();
  const recordPrint = useRecordPrint();

  // focus utile à l'étape 3
  useEffect(() => {
    if (step === 3) setTimeout(() => lotRef.current?.focus(), 100);
  }, [step]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (familyFilter) list = list.filter(p => p.family === familyFilter);
    if (showFavoritesOnly) list = list.filter(p => favorites.includes(p.id));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.sku_base.toLowerCase().includes(q) ||
        (p.old_code ?? '').toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 60);
  }, [products, search, familyFilter, showFavoritesOnly, favorites]);

  // options autorisées
  const allowedTemps = useMemo(
    () => Array.from(new Set(variants.map(v => v.temperature))),
    [variants]
  );
  const allowedSlicing = useMemo(
    () => Array.from(new Set(
      variants.filter(v => !temperature || v.temperature === temperature).map(v => v.slicing)
    )),
    [variants, temperature]
  );
  const allowedPackaging = useMemo(
    () => Array.from(new Set(
      variants
        .filter(v => (!temperature || v.temperature === temperature) &&
                     (!slicing || v.slicing === slicing))
        .map(v => v.packaging)
    )),
    [variants, temperature, slicing]
  );

  const matchedVariant = useMemo(
    () => variants.find(v =>
      v.temperature === temperature && v.slicing === slicing && v.packaging === packaging
    ),
    [variants, temperature, slicing, packaging]
  );

  const finalSku = selectedProduct && temperature && slicing && packaging
    ? `${selectedProduct.sku_base}-${temperature}-${slicing}-${packaging}`
    : '';

  const reset = () => {
    setStep(1);
    setSelectedProduct(null);
    setTemperature(null); setSlicing(null); setPackaging(null);
    setLot(''); setDdm(''); setQuantity('1');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleQuickReprint = (h: typeof history[number]) => {
    const product = products.find(p => p.id === h.product_id);
    if (!product) {
      toast.error('Produit introuvable');
      return;
    }
    setSelectedProduct(product);
    setTemperature(h.temperature as Temperature);
    setSlicing(h.slicing as Slicing);
    setPackaging(h.packaging as Packaging);
    setLot(h.lot_number);
    setDdm(h.ddm);
    setQuantity(String(h.quantity));
    setStep(4);
  };

  const handlePrint = async () => {
    if (!selectedProduct || !matchedVariant || !lot.trim() || !ddm || Number(quantity) < 1) {
      toast.error('Informations manquantes');
      return;
    }
    setPrinting(true);
    const payload = {
      productId: selectedProduct.id,
      sku_base: selectedProduct.sku_base,
      final_sku: finalSku,
      old_code: selectedProduct.old_code,
      temperature, slicing, packaging,
      lot, ddm, quantity: Number(quantity),
      template: matchedVariant.template_name,
    };
    try {
      // Hook Zebra API ici (POST /print-label) — placeholder
      console.log('[print-label]', payload);

      await recordPrint.mutateAsync({
        product_id: selectedProduct.id,
        variant_id: matchedVariant.id,
        final_sku: finalSku,
        sku_base: selectedProduct.sku_base,
        old_code: selectedProduct.old_code,
        temperature: temperature!,
        slicing: slicing!,
        packaging: packaging!,
        template_name: matchedVariant.template_name,
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
            Étape {step}/4 — {['Produit', 'Variantes', 'Lot & DDM', 'Confirmation'][step - 1]}
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
        {[1, 2, 3, 4].map(s => (
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
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher SKU, ancien code, libellé, famille…"
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
                  Aucun produit trouvé. Configurez le catalogue dans le paramétrage.
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
                                {p.sku_base}
                              </p>
                              <p className="text-sm font-medium leading-tight mt-1">
                                {p.label}
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
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{p.family}</Badge>
                            {p.old_code && (
                              <Badge variant="outline" className="font-mono text-xs">
                                ERP {p.old_code}
                              </Badge>
                            )}
                          </div>
                          <Button
                            className="w-full"
                            size="lg"
                            onClick={() => { setSelectedProduct(p); setStep(2); }}
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
      {step === 2 && selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedProduct.label}</CardTitle>
            <p className="font-mono text-sm text-muted-foreground">{selectedProduct.sku_base}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {variants.length === 0 ? (
              <p className="text-center text-muted-foreground p-6">
                Aucune variante configurée pour ce produit.
              </p>
            ) : (
              <>
                <Section title="Température">
                  <BigBtn label="Frais" code="FR" icon={Sun}
                    selected={temperature === 'FR'} disabled={!allowedTemps.includes('FR')}
                    onClick={() => { setTemperature('FR'); setSlicing(null); setPackaging(null); }} />
                  <BigBtn label="Surgelé" code="FZ" icon={Snowflake}
                    selected={temperature === 'FZ'} disabled={!allowedTemps.includes('FZ')}
                    onClick={() => { setTemperature('FZ'); setSlicing(null); setPackaging(null); }} />
                </Section>

                <Section title="Finition" disabled={!temperature}>
                  <BigBtn label="Tranché" code="SLI" icon={Scissors}
                    selected={slicing === 'SLI'} disabled={!allowedSlicing.includes('SLI')}
                    onClick={() => { setSlicing('SLI'); setPackaging(null); }} />
                  <BigBtn label="Non tranché" code="WHO" icon={Layers}
                    selected={slicing === 'WHO'} disabled={!allowedSlicing.includes('WHO')}
                    onClick={() => { setSlicing('WHO'); setPackaging(null); }} />
                </Section>

                <Section title="Conditionnement" disabled={!slicing}>
                  {(['U01', 'C05', 'C24', 'PAL'] as Packaging[]).map(p => (
                    <BigBtn key={p} label={PACKAGING_LABELS[p]} code={p}
                      icon={p === 'PAL' ? Boxes : Package}
                      selected={packaging === p} disabled={!allowedPackaging.includes(p)}
                      onClick={() => setPackaging(p)} />
                  ))}
                </Section>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
                    Retour
                  </Button>
                  <Button size="lg" disabled={!matchedVariant} className="flex-1"
                    onClick={() => setStep(3)}>
                    Continuer
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ÉTAPE 3 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de lot</CardTitle>
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
              <Button variant="outline" size="lg" onClick={() => setStep(2)} className="flex-1">
                Retour
              </Button>
              <Button size="lg" className="flex-1"
                disabled={!lot.trim() || !ddm || Number(quantity) < 1}
                onClick={() => setStep(4)}>
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ÉTAPE 4 */}
      {step === 4 && selectedProduct && matchedVariant && (
        <Card className="border-primary border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-6 w-6 text-primary" />
              Confirmation avant impression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow label="Produit" value={selectedProduct.label} />
            <SummaryRow label="SKU final" value={finalSku} mono />
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryRow label="Température"
                value={temperature === 'FR' ? 'Frais' : 'Surgelé'} />
              <SummaryRow label="Finition"
                value={slicing === 'SLI' ? 'Tranché' : 'Non tranché'} />
              <SummaryRow label="Conditionnement" value={PACKAGING_LABELS[packaging!]} />
              <SummaryRow label="Lot" value={lot} mono />
              <SummaryRow label="DDM" value={new Date(ddm).toLocaleDateString('fr-FR')} />
              <SummaryRow label="Quantité" value={`${quantity} étiquette(s)`} />
            </div>
            <Separator />
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
              <span className="text-sm text-muted-foreground">Template Zebra</span>
              <Badge variant="default" className="font-mono">{matchedVariant.template_name}</Badge>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(3)} className="flex-1">
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

function Section({ title, disabled, children }: { title: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('space-y-3', disabled && 'opacity-50 pointer-events-none')}>
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

function BigBtn({
  label, code, icon: Icon, selected, disabled, onClick,
}: {
  label: string; code: string; icon: any;
  selected: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-4 h-24 rounded-xl border-2 transition-all',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-[1.02]'
          : 'border-border bg-card hover:border-primary/50',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      <Icon className="h-6 w-6" />
      <div className="text-center">
        <p className="font-semibold text-sm leading-tight">{label}</p>
        <p className="text-xs opacity-70 font-mono">{code}</p>
      </div>
    </button>
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
