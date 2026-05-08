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
  Download,
} from 'lucide-react';
import {
  usePrintProducts, usePrintHistory,
  usePrintFavorites, useToggleFavorite, useRecordPrint,
  type PrintProduct,
} from '@/hooks/usePrintLabels';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { fillZplTemplate, DEFAULT_PRODUCT_LABEL_ZPL } from '@/lib/zplLabelGenerator';
import { printZpl, isZebraSupported, pickZebraPrinter } from '@/lib/zebraWebUsb';
import labelLogoM from '@/assets/label-logo-m.png';
import labelWordmark from '@/assets/label-wordmark.png';
import labelTriman from '@/assets/label-triman.png';

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
  const [fallbackZpl, setFallbackZpl] = useState<string | null>(null);

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

  // Génère un n° de lot L + jour de l'année (3 chiffres) + 2 derniers chiffres de l'année
  // Ex: 03 janvier 2026 -> L00326
  const computeLotNumber = (isoDate: string): string => {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / 86400000);
    const yy = String(d.getFullYear()).slice(-2);
    return `L${String(dayOfYear).padStart(3, '0')}${yy}`;
  };

  const handleProductionDateChange = (val: string) => {
    setProductionDate(val);
    setLot(computeLotNumber(val));
  };

  const reset = () => {
    setStep(1);
    setSelected(null);
    setLot(''); setProductionDate(''); setDdm(''); setQuantity('1');
    setFallbackZpl(null);
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
    setProductionDate('');
    setDdm(h.ddm);
    setQuantity(String(h.quantity));
    setFallbackZpl(null);
    setStep(3);
  };

  const buildZpl = async () => {
    if (!selected) throw new Error('Article manquant');
    const { data: tpl } = await supabase
      .from('label_templates')
      .select('zpl_content')
      .eq('template_code', 'PRODUCT_LABEL')
      .eq('active', true)
      .maybeSingle();
    const zplTemplate = (tpl?.zpl_content as string | null) || DEFAULT_PRODUCT_LABEL_ZPL;

    return fillZplTemplate(zplTemplate, {
      designation: selected.product_name || selected.erp_label,
      barcode: selected.barcode_value,
      netWeight: selected.net_weight,
      netWeightUnit: selected.net_weight_unit,
      ingredientsHtml: selected.ingredients_html,
      allergens: selected.allergen_statement || '',
      traces: '',
      nutrition: selected.nutrition,
      lotNumber: lot,
      ddm,
      quantity: Number(quantity),
    });
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
    if (!isZebraSupported()) {
      toast.error("WebUSB non disponible. Utilisez Chrome/Edge en HTTPS.");
      return;
    }
    setPrinting(true);
    try {
      const zpl = await buildZpl();
      setFallbackZpl(zpl);

      const result = await printZpl(zpl);

      // 4) Historique
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
      toast.success(
        `${quantity} étiquette(s) envoyée(s) à l'imprimante` +
        (result.method === 'browserprint' ? ' via Zebra Browser Print' : '')
      );
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur impression');
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadZpl = async () => {
    try {
      const zpl = fallbackZpl || await buildZpl();
      setFallbackZpl(zpl);
      const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${finalSku || selected?.sku_base || 'etiquette'}_${lot || 'lot'}.zpl`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Fichier ZPL généré');
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible de générer le ZPL');
    }
  };

  const handlePickPrinter = async () => {
    try {
      await pickZebraPrinter();
      toast.success('Imprimante Zebra sélectionnée');
    } catch (e: any) {
      toast.error(e?.message ?? 'Sélection annulée');
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
              <Label htmlFor="prod-date">Date de fabrication *</Label>
              <Input
                id="prod-date"
                ref={lotRef as any}
                type="date"
                value={productionDate}
                onChange={e => handleProductionDateChange(e.target.value)}
                className="h-14 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot">Numéro de lot *</Label>
              <Input
                id="lot"
                value={lot}
                onChange={e => setLot(e.target.value)}
                placeholder="Auto : L + jour de l'année + AA"
                className="h-14 text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Généré automatiquement depuis la date de fabrication. Modifiable si besoin.
              </p>
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
                  Aperçu du masque d'étiquette
                </h3>
                {selected.inco_status && (
                  <Badge variant={selected.inco_status === 'validated' ? 'default' : 'destructive'}>
                    INCO {selected.inco_status === 'validated' ? 'validé' : selected.inco_status}
                  </Badge>
                )}
              </div>

              <LabelMaskPreview
                product={selected}
                lot={lot}
                ddm={ddm}
              />
            </div>

            <Separator />
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
              <span className="text-sm text-muted-foreground">Template Zebra</span>
              <Badge variant="default" className="font-mono">{selected.template_name}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handlePickPrinter} className="w-full">
              <Printer className="h-4 w-4 mr-2" /> Choisir / changer l'imprimante Zebra
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadZpl} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Télécharger le ZPL de secours
            </Button>

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

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\/?strong>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function LabelMaskPreview({
  product, lot, ddm,
}: {
  product: PrintProduct;
  lot: string;
  ddm: string;
}) {
  const ddmFr = (() => {
    if (!ddm) return '--/--/----';
    const d = new Date(ddm + 'T00:00:00');
    return isNaN(d.getTime()) ? '--/--/----' : d.toLocaleDateString('fr-FR');
  })();
  const lotDisplay = lot ? (lot.startsWith('L') ? lot : `L${lot}`) : 'L-----';

  // Conditionnement → nombre d'unités par carton
  const PACK_COUNT: Record<string, number> = { U01: 1, C05: 5, C24: 24, PAL: 1 };
  const packCount = PACK_COUNT[product.packaging] ?? 1;
  const unitWeight = product.net_weight ?? 0;
  const unitWeightUnit = product.net_weight_unit || 'kg';

  // Format poids unitaire en grammes si kg < 1, sinon garder l'unité
  const formatUnitWeight = (w: number, u: string): string => {
    if (u === 'kg' && w < 1) return `${Math.round(w * 1000)}g`;
    return `${w}${u}`;
  };

  const baseName = product.product_name || product.erp_label;
  const designation = packCount > 1
    ? `${baseName} ${packCount}x${formatUnitWeight(unitWeight, unitWeightUnit)}`
    : `${baseName} ${formatUnitWeight(unitWeight, unitWeightUnit)}`;

  // Poids net total = conditionnement × poids unitaire
  const totalWeight = unitWeight * packCount;
  const poidsNet = unitWeight
    ? (unitWeightUnit === 'kg'
        ? `${totalWeight.toFixed(totalWeight >= 10 ? 2 : 3).replace(/\.?0+$/, '')} kg`
        : `${totalWeight} ${unitWeightUnit}`)
    : '— kg';
  const ingredients = stripHtml(product.ingredients_html);
  const allergens = product.allergen_statement || '';
  const traces = (product as any).traces_statement || '';
  const n = product.nutrition;
  const nutriLines = n ? [
    `Energie ${Math.round(n.energyKj ?? 0)} kJ / ${Math.round(n.energyKcal ?? 0)} kcal`,
    `Lipides ${(n.fat ?? 0).toFixed(1)} g dont satures ${(n.saturatedFat ?? 0).toFixed(1)} g`,
    `Glucides ${(n.carbohydrates ?? 0).toFixed(1)} g dont sucres ${(n.sugars ?? 0).toFixed(1)} g`,
    `Fibres ${(n.fiber ?? 0).toFixed(1)} g  -  Proteines ${(n.protein ?? 0).toFixed(1)} g  -  Sel ${(n.salt ?? 0).toFixed(2)} g`,
  ] : ['Données nutritionnelles manquantes'];

  return (
    <div className="w-full overflow-x-auto bg-muted/30 p-4 rounded-md">
      <div
        className="mx-auto bg-white text-black shadow-md overflow-hidden"
        style={{
          width: '100%',
          maxWidth: 820,
          aspectRatio: '101.6 / 63.5',
          fontFamily: 'Arial, Helvetica, sans-serif',
          containerType: 'inline-size',
          padding: '1.5cqw',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header: logo M + wordmark + designation */}
        <div className="flex items-center" style={{ gap: '1.5cqw', height: '14cqw' }}>
          <div className="flex flex-col items-center shrink-0" style={{ width: '11cqw' }}>
            <img src={labelLogoM} alt="" style={{ height: '8cqw' }} className="w-auto object-contain" />
            <img src={labelWordmark} alt="Bread Shop" style={{ height: '3cqw', marginTop: '0.3cqw' }} className="w-auto object-contain" />
          </div>
          <div
            className="flex-1 text-center font-extrabold leading-none truncate"
            style={{ fontSize: '6.5cqw' }}
          >
            {designation}
          </div>
        </div>
        <div style={{ borderTop: '0.4cqw solid #000', margin: '0.8cqw 0 1cqw' }} />

        {/* Body: 2 columns — fills remaining space, no overflow */}
        <div className="flex min-h-0 flex-1" style={{ gap: '1.5cqw', overflow: 'hidden' }}>
          {/* Left column */}
          <div
            className="flex-1 min-w-0 leading-tight overflow-hidden"
            style={{ fontSize: '2.4cqw', display: 'flex', flexDirection: 'column', gap: '0.5cqw' }}
          >
            <div className="min-h-0" style={{ overflow: 'hidden' }}>
              <div className="font-bold">Ingrédients :</div>
              <div className="break-words" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {ingredients || <span className="text-destructive">Manquant</span>}
              </div>
            </div>
            <div className="break-words">
              <span className="font-bold">Allergène(s) : </span>
              <span>{allergens || '—'}</span>
            </div>
            <div className="break-words">
              <span className="font-bold">Trace(s) : </span>
              <span>{traces || '—'}</span>
            </div>
            <div className="italic break-words">
              À conserver dans le sachet à température ambiante de préférence inférieure à 30°C
            </div>
            <div className="min-h-0" style={{ overflow: 'hidden' }}>
              <div className="font-bold">Valeurs nutritionnelles pour 100g :</div>
              {nutriLines.map((l, i) => <div key={i} className="break-words">{l}</div>)}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col shrink-0" style={{ width: '38%', gap: '1cqw' }}>
            {/* Poids net box — 6mm minimum (≈5.9cqw of 101.6mm width) */}
            <div className="border-2 border-black relative flex flex-col items-center justify-center" style={{ padding: '0.8cqw', minHeight: '14cqw' }}>
              <div style={{ fontSize: '2cqw', position: 'absolute', top: '0.5cqw', right: '0.8cqw' }}>POIDS NET</div>
              <div className="font-extrabold leading-none text-center" style={{ fontSize: '8cqw', marginTop: '1.5cqw' }}>
                {poidsNet}
              </div>
            </div>

            {/* DDM + Lot box */}
            <div className="border-2 border-black leading-tight" style={{ padding: '0.8cqw', fontSize: '2.6cqw' }}>
              <div>À consommer de préférence</div>
              <div className="flex items-baseline" style={{ gap: '1cqw' }}>
                <span>avant le :</span>
                <span className="font-bold" style={{ fontSize: '4cqw' }}>{ddmFr}</span>
              </div>
              <div className="flex items-baseline" style={{ gap: '1cqw', marginTop: '0.4cqw' }}>
                <span>Lot :</span>
                <span className="font-bold tracking-wider" style={{ fontSize: '4cqw' }}>{lotDisplay}</span>
              </div>
            </div>

            {/* Recyclage + triman row */}
            <div className="flex items-center justify-center" style={{ gap: '1cqw' }}>
              <div className="text-center italic" style={{ fontSize: '2.2cqw' }}>
                Carton et sachet<br />recyclables
              </div>
              <img src={labelTriman} alt="Triman" style={{ height: '7cqw' }} className="w-auto object-contain" />
            </div>
            {product.barcode_value ? (
              <div>
                <div
                  className="w-full"
                  style={{
                    height: '5cqw',
                    background: 'repeating-linear-gradient(90deg, #000 0 2px, #fff 2px 4px, #000 4px 5px, #fff 5px 8px, #000 8px 9px, #fff 9px 11px)',
                  }}
                />
                <div className="text-center font-mono" style={{ fontSize: '2.4cqw' }}>
                  {product.barcode_value}
                </div>
              </div>
            ) : (
              <div className="text-destructive text-center" style={{ fontSize: '2.2cqw' }}>Pas de code-barres</div>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Aperçu visuel du masque imprimé (101,6 × 63,5 mm) — POIDS NET ≥ 6 mm (réglementaire).
      </p>
    </div>
  );
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
