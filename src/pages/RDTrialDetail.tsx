import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Clock, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  useRDTrial, useUpdateRDTrial, useUpsertTrialIngredient, useDeleteTrialIngredient,
  useUpsertTrialRabat, useDeleteTrialRabat, useAddJournalEntry, useDeleteJournalEntry,
  RD_TRIAL_STATUSES, RD_TRIAL_DECISIONS, getStatusMeta,
} from '@/hooks/useRDTrials';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { AddRDIngredientDialog } from '@/components/rd/AddRDIngredientDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const N = (v: any) => (v === '' || v == null ? null : Number(v));
const minutesBetween = (a?: string | null, b?: string | null) => {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return d > 0 ? Math.round(d) : null;
};

export default function RDTrialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useRDTrial(id);
  const update = useUpdateRDTrial();
  const upsertIng = useUpsertTrialIngredient();
  const deleteIng = useDeleteTrialIngredient();
  const upsertRab = useUpsertTrialRabat();
  const deleteRab = useDeleteTrialRabat();
  const addJournal = useAddJournalEntry();
  const deleteJournal = useDeleteJournalEntry();
  const { data: recipes } = useActiveRecipes();

  const [form, setForm] = useState<any>(null);
  const saveTimer = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [journalText, setJournalText] = useState('');

  useEffect(() => {
    if (data?.trial) setForm(data.trial);
  }, [data?.trial]);

  // Calculs auto
  useEffect(() => {
    if (!form) return;
    const notes = [form.eval_volume, form.eval_alveolage, form.eval_tenue, form.eval_coloration, form.eval_croustillance, form.eval_gout, form.eval_maniabilite]
      .map(N).filter((v) => v != null) as number[];
    const avg = notes.length ? Math.round((notes.reduce((s, v) => s + v, 0) / notes.length) * 10) / 10 : null;
    if (avg !== form.eval_average) setForm((f: any) => ({ ...f, eval_average: avg }));
  }, [form?.eval_volume, form?.eval_alveolage, form?.eval_tenue, form?.eval_coloration, form?.eval_croustillance, form?.eval_gout, form?.eval_maniabilite]);

  // Auto-save (debounced)
  const triggerSave = useCallback((next: any) => {
    if (!id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      const { id: _, recipes: __, created_at, updated_at, trial_number, created_by, ...payload } = next;
      // Numeric coercion
      const numFields = ['trial_version', 'temp_flour', 'temp_water', 'temp_lab', 'temp_base', 'temp_target', 'temp_actual_end_kneading',
        'speed1_duration_min', 'speed2_duration_min', 'kneading_total_min', 'pointage_dough_temp', 'pointage_ambient_temp',
        'pointage_humidity', 'patons_weight', 'detente_duration_min', 'appret_temp', 'appret_humidity', 'cooking_temp',
        'cooking_duration_min', 'eval_volume', 'eval_alveolage', 'eval_tenue', 'eval_coloration', 'eval_croustillance',
        'eval_gout', 'eval_maniabilite', 'eval_average', 'total_hydration'];
      numFields.forEach((k) => { if (k in payload) payload[k] = N(payload[k]); });
      try {
        await update.mutateAsync({ id, ...payload });
      } catch (e) { /* toast géré */ }
      finally { setSaving(false); }
    }, 800);
  }, [id, update]);

  const setField = (key: string, value: any) => {
    setForm((f: any) => {
      const next = { ...f, [key]: value };
      triggerSave(next);
      return next;
    });
  };

  if (isLoading || !form) {
    return <div className="text-center py-12 text-muted-foreground">Chargement…</div>;
  }

  const meta = getStatusMeta(form.status);
  const tempGap = form.temp_target != null && form.temp_actual_end_kneading != null
    ? Math.round((form.temp_actual_end_kneading - form.temp_target) * 10) / 10
    : null;
  const pointageDuration = minutesBetween(form.pointage_start, form.pointage_end);
  const appretDuration = minutesBetween(form.appret_start, form.appret_end);

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* En-tête */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products/rd-trials')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Save className={cn('h-4 w-4', saving && 'animate-pulse text-primary')} />
            {saving ? 'Enregistrement…' : 'Enregistré automatiquement'}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">{form.trial_number}</span>
              <Badge variant="outline" className="text-xs">v{form.trial_version}</Badge>
              <Badge variant="outline" className={cn('text-xs', meta.color)}>{meta.label}</Badge>
              {form.is_archived && <Badge variant="outline" className="text-xs">Archivé</Badge>}
            </div>
            <Input
              value={form.trial_name ?? ''}
              onChange={(e) => setField('trial_name', e.target.value)}
              className="text-2xl font-bold border-0 px-0 h-auto focus-visible:ring-0 shadow-none"
              placeholder="Nom de l'essai"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RD_TRIAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Version</Label>
                <Input type="number" value={form.trial_version ?? ''} onChange={(e) => setField('trial_version', e.target.value)} />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="datetime-local"
                  value={form.trial_date ? format(new Date(form.trial_date), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setField('trial_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Accordion type="multiple" defaultValue={['general', 'formulation']} className="space-y-2">
        {/* GÉNÉRALITÉS */}
        <AccordionItem value="general" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">Informations générales</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Recette (référentiel)</Label>
                <Select value={form.recipe_id ?? 'none'} onValueChange={(v) => setField('recipe_id', v === 'none' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucune —</SelectItem>
                    {recipes?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name} {r.code ? `(${r.code})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom recette (libre)</Label>
                <Input value={form.recipe_name_text ?? ''} onChange={(e) => setField('recipe_name_text', e.target.value)} />
              </div>
              <div>
                <Label>Version recette</Label>
                <Input value={form.recipe_version_text ?? ''} onChange={(e) => setField('recipe_version_text', e.target.value)} />
              </div>
              <div>
                <Label>Produit concerné</Label>
                <Input value={form.product_concerned ?? ''} onChange={(e) => setField('product_concerned', e.target.value)} />
              </div>
              <div>
                <Label>Opérateur</Label>
                <Input value={form.operator_name ?? ''} onChange={(e) => setField('operator_name', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Objectif du test</Label>
                <Textarea value={form.objective ?? ''} onChange={(e) => setField('objective', e.target.value)} rows={2} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* FORMULATION */}
        <AccordionItem value="formulation" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">Formulation</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Hydratation totale (%)</Label>
                <Input type="number" step="0.1" value={form.total_hydration ?? ''} onChange={(e) => setField('total_hydration', e.target.value)} />
              </div>
              <div>
                <Label>Observations formulation</Label>
                <Input value={form.formulation_notes ?? ''} onChange={(e) => setField('formulation_notes', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ingrédients</Label>
                <AddRDIngredientDialog trialId={id!} orderIndex={data!.ingredients.length} />
              </div>
              <div className="space-y-2">
                {data!.ingredients.map((ing) => (
                  <div key={ing.id} className="grid grid-cols-12 gap-2 items-end p-2 rounded border bg-muted/20">
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-xs flex items-center gap-2">
                        Nom
                        {ing.raw_material_id ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] py-0">MP référencée</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px] py-0">Manuel</Badge>
                        )}
                      </Label>
                      <Input defaultValue={ing.ingredient_name} onBlur={(e) => upsertIng.mutate({ ...ing, ingredient_name: e.target.value })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Qté</Label>
                      <Input type="number" step="0.001" defaultValue={ing.quantity} onBlur={(e) => upsertIng.mutate({ ...ing, quantity: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Unité</Label>
                      <Input defaultValue={ing.unit} onBlur={(e) => upsertIng.mutate({ ...ing, unit: e.target.value })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">% Boul.</Label>
                      <Input type="number" step="0.1" defaultValue={ing.baker_percentage ?? ''} onBlur={(e) => upsertIng.mutate({ ...ing, baker_percentage: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                    <div className="col-span-10 md:col-span-1">
                      <Label className="text-xs">Obs.</Label>
                      <Input defaultValue={ing.observations ?? ''} onBlur={(e) => upsertIng.mutate({ ...ing, observations: e.target.value })} />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => deleteIng.mutate({ id: ing.id, trialId: id! })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {data!.ingredients.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Aucun ingrédient</p>}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* TEMPÉRATURES */}
        <AccordionItem value="temps" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            Températures {tempGap != null && (
              <Badge variant="outline" className={cn('ml-2', Math.abs(tempGap) <= 1 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700')}>
                Écart : {tempGap > 0 ? '+' : ''}{tempGap}°C
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            {[
              ['temp_flour', 'T° farine'],
              ['temp_water', 'T° eau'],
              ['temp_lab', 'T° laboratoire'],
              ['temp_base', 'T° de base'],
              ['temp_target', 'T° cible'],
              ['temp_actual_end_kneading', 'T° réelle fin pétrissage'],
            ].map(([k, label]) => (
              <div key={k}>
                <Label>{label} (°C)</Label>
                <Input type="number" step="0.1" value={form[k] ?? ''} onChange={(e) => setField(k, e.target.value)} />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* PÉTRISSAGE */}
        <AccordionItem value="kneading" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">Pétrissage</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-3 pt-2">
            <div><Label>Type de pétrin</Label><Input value={form.mixer_type ?? ''} onChange={(e) => setField('mixer_type', e.target.value)} /></div>
            <div><Label>Frasage</Label><Input value={form.frasage_notes ?? ''} onChange={(e) => setField('frasage_notes', e.target.value)} /></div>
            <div><Label>Autolyse</Label><Input value={form.autolyse_notes ?? ''} onChange={(e) => setField('autolyse_notes', e.target.value)} /></div>
            <div><Label>Bassinage</Label><Input value={form.bassinage_notes ?? ''} onChange={(e) => setField('bassinage_notes', e.target.value)} /></div>
            <div><Label>Vitesse 1</Label><Input value={form.speed1_value ?? ''} onChange={(e) => setField('speed1_value', e.target.value)} /></div>
            <div><Label>Durée vitesse 1 (min)</Label><Input type="number" step="0.5" value={form.speed1_duration_min ?? ''} onChange={(e) => setField('speed1_duration_min', e.target.value)} /></div>
            <div><Label>Vitesse 2</Label><Input value={form.speed2_value ?? ''} onChange={(e) => setField('speed2_value', e.target.value)} /></div>
            <div><Label>Durée vitesse 2 (min)</Label><Input type="number" step="0.5" value={form.speed2_duration_min ?? ''} onChange={(e) => setField('speed2_duration_min', e.target.value)} /></div>
            <div><Label>Temps total (min)</Label><Input type="number" step="0.5" value={form.kneading_total_min ?? ''} onChange={(e) => setField('kneading_total_min', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Observations</Label><Textarea rows={2} value={form.kneading_observations ?? ''} onChange={(e) => setField('kneading_observations', e.target.value)} /></div>
          </AccordionContent>
        </AccordionItem>

        {/* POINTAGE */}
        <AccordionItem value="pointage" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            Pointage {pointageDuration != null && <Badge variant="outline" className="ml-2">{pointageDuration} min</Badge>}
          </AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-3 pt-2">
            <div><Label>Heure début</Label><Input type="datetime-local" value={form.pointage_start ? format(new Date(form.pointage_start), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setField('pointage_start', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            <div><Label>Heure fin</Label><Input type="datetime-local" value={form.pointage_end ? format(new Date(form.pointage_end), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setField('pointage_end', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            <div><Label>T° pâte (°C)</Label><Input type="number" step="0.1" value={form.pointage_dough_temp ?? ''} onChange={(e) => setField('pointage_dough_temp', e.target.value)} /></div>
            <div><Label>T° ambiante (°C)</Label><Input type="number" step="0.1" value={form.pointage_ambient_temp ?? ''} onChange={(e) => setField('pointage_ambient_temp', e.target.value)} /></div>
            <div><Label>Hygrométrie (%)</Label><Input type="number" step="0.1" value={form.pointage_humidity ?? ''} onChange={(e) => setField('pointage_humidity', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Observations</Label><Textarea rows={2} value={form.pointage_observations ?? ''} onChange={(e) => setField('pointage_observations', e.target.value)} /></div>
          </AccordionContent>
        </AccordionItem>

        {/* RABATS */}
        <AccordionItem value="rabats" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">Rabats</AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => upsertRab.mutate({ trial_id: id!, order_index: data!.rabats.length })}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter un rabat
            </Button>
            {data!.rabats.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-2 items-end p-2 rounded border bg-muted/20">
                <div className="col-span-12 md:col-span-4">
                  <Label className="text-xs">Heure</Label>
                  <Input type="datetime-local" defaultValue={r.rabat_time ? format(new Date(r.rabat_time), "yyyy-MM-dd'T'HH:mm") : ''} onBlur={(e) => upsertRab.mutate({ ...r, rabat_time: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Label className="text-xs">Type</Label>
                  <Input defaultValue={r.rabat_type ?? ''} onBlur={(e) => upsertRab.mutate({ ...r, rabat_type: e.target.value })} />
                </div>
                <div className="col-span-6 md:col-span-4">
                  <Label className="text-xs">Observation</Label>
                  <Input defaultValue={r.observation ?? ''} onBlur={(e) => upsertRab.mutate({ ...r, observation: e.target.value })} />
                </div>
                <div className="col-span-12 md:col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => deleteRab.mutate({ id: r.id, trialId: id! })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {data!.rabats.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Aucun rabat</p>}
          </AccordionContent>
        </AccordionItem>

        {/* DIVISION/DÉTENTE */}
        <AccordionItem value="division" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">Division & détente</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-3 pt-2">
            <div><Label>Heure division</Label><Input type="datetime-local" value={form.division_time ? format(new Date(form.division_time), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setField('division_time', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            <div><Label>Poids pâtons (g)</Label><Input type="number" step="1" value={form.patons_weight ?? ''} onChange={(e) => setField('patons_weight', e.target.value)} /></div>
            <div><Label>Durée détente (min)</Label><Input type="number" step="1" value={form.detente_duration_min ?? ''} onChange={(e) => setField('detente_duration_min', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Observations</Label><Textarea rows={2} value={form.division_observations ?? ''} onChange={(e) => setField('division_observations', e.target.value)} /></div>
          </AccordionContent>
        </AccordionItem>

        {/* APPRÊT */}
        <AccordionItem value="appret" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            Apprêt {appretDuration != null && <Badge variant="outline" className="ml-2">{appretDuration} min</Badge>}
          </AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-3 pt-2">
            <div><Label>Heure début</Label><Input type="datetime-local" value={form.appret_start ? format(new Date(form.appret_start), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setField('appret_start', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            <div><Label>Heure fin</Label><Input type="datetime-local" value={form.appret_end ? format(new Date(form.appret_end), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setField('appret_end', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            <div><Label>Température (°C)</Label><Input type="number" step="0.1" value={form.appret_temp ?? ''} onChange={(e) => setField('appret_temp', e.target.value)} /></div>
            <div><Label>Hygrométrie (%)</Label><Input type="number" step="0.1" value={form.appret_humidity ?? ''} onChange={(e) => setField('appret_humidity', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Observations</Label><Textarea rows={2} value={form.appret_observations ?? ''} onChange={(e) => setField('appret_observations', e.target.value)} /></div>
          </AccordionContent>
        </AccordionItem>

        {/* CUISSON */}
        <AccordionItem value="cooking" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">Cuisson</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-3 pt-2">
            <div><Label>Type de four</Label><Input value={form.oven_type ?? ''} onChange={(e) => setField('oven_type', e.target.value)} /></div>
            <div><Label>Température (°C)</Label><Input type="number" step="1" value={form.cooking_temp ?? ''} onChange={(e) => setField('cooking_temp', e.target.value)} /></div>
            <div className="flex items-center justify-between rounded border px-3 py-2">
              <Label className="mb-0">Buée</Label>
              <Switch checked={!!form.steam} onCheckedChange={(v) => setField('steam', v)} />
            </div>
            <div><Label>Temps de cuisson (min)</Label><Input type="number" step="1" value={form.cooking_duration_min ?? ''} onChange={(e) => setField('cooking_duration_min', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Observations</Label><Textarea rows={2} value={form.cooking_observations ?? ''} onChange={(e) => setField('cooking_observations', e.target.value)} /></div>
          </AccordionContent>
        </AccordionItem>

        {/* ÉVALUATION */}
        <AccordionItem value="eval" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            Évaluation finale {form.eval_average != null && (
              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
                Moyenne : {Number(form.eval_average).toFixed(1)}/10
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            {[
              ['eval_volume', 'Volume'],
              ['eval_alveolage', 'Alvéolage'],
              ['eval_tenue', 'Tenue'],
              ['eval_coloration', 'Coloration'],
              ['eval_croustillance', 'Croustillance'],
              ['eval_gout', 'Goût'],
              ['eval_maniabilite', 'Maniabilité'],
            ].map(([k, label]) => (
              <div key={k}>
                <Label>{label} (/10)</Label>
                <Input type="number" min="0" max="10" step="0.5" value={form[k] ?? ''} onChange={(e) => setField(k, e.target.value)} />
              </div>
            ))}
            <div className="md:col-span-3">
              <Label>Notes d'évaluation</Label>
              <Textarea rows={2} value={form.eval_notes ?? ''} onChange={(e) => setField('eval_notes', e.target.value)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* JOURNAL */}
        <AccordionItem value="journal" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            Journal de process <Badge variant="outline" className="ml-2">{data!.journal.length}</Badge>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un commentaire horodaté…"
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && journalText.trim()) {
                    addJournal.mutate({ trialId: id!, comment: journalText.trim() });
                    setJournalText('');
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (!journalText.trim()) return;
                  addJournal.mutate({ trialId: id!, comment: journalText.trim() });
                  setJournalText('');
                }}
              >
                <MessageSquarePlus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {data!.journal.map((j) => (
                <div key={j.id} className="flex items-start gap-3 p-3 rounded border bg-muted/20">
                  <Clock className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{format(new Date(j.entry_time), "dd MMM yyyy 'à' HH:mm", { locale: fr })}{j.author_name ? ` — ${j.author_name}` : ''}</p>
                    <p className="text-sm whitespace-pre-wrap">{j.comment}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteJournal.mutate({ id: j.id, trialId: id! })}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              {data!.journal.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Aucune entrée</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* CONCLUSION */}
        <AccordionItem value="conclusion" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">Conclusion</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-3 pt-2">
            <div className="md:col-span-2"><Label>Hypothèse testée</Label><Textarea rows={2} value={form.conclusion_hypothesis ?? ''} onChange={(e) => setField('conclusion_hypothesis', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Résultat obtenu</Label><Textarea rows={2} value={form.conclusion_result ?? ''} onChange={(e) => setField('conclusion_result', e.target.value)} /></div>
            <div><Label>Écarts constatés</Label><Textarea rows={2} value={form.conclusion_gaps ?? ''} onChange={(e) => setField('conclusion_gaps', e.target.value)} /></div>
            <div><Label>Actions correctives</Label><Textarea rows={2} value={form.conclusion_corrective ?? ''} onChange={(e) => setField('conclusion_corrective', e.target.value)} /></div>
            <div className="md:col-span-2">
              <Label>Décision</Label>
              <Select value={form.conclusion_decision ?? 'none'} onValueChange={(v) => setField('conclusion_decision', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {RD_TRIAL_DECISIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
