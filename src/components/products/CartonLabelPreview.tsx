import { CartonLabel } from '@/hooks/useCartonLabels';
import logoImage from '@/assets/logo-breadshop.png';
import { getLabelDict } from '@/lib/cartonLabelI18n';

interface CartonLabelPreviewProps {
  label: CartonLabel;
}

export function CartonLabelPreview({ label }: CartonLabelPreviewProps) {
  const nutrition = label.snapshot_nutrition as Record<string, number> | null;
  const secondaryAllergens = label.snapshot_allergens_secondary as string[] | null;
  const t = getLabelDict(label.language);

  return (
    <div className="w-full flex justify-center">
      {/* Label container - 120mm x 64mm at screen scale (roughly 453px x 242px at 96dpi) */}
      <div 
        className="bg-white border-2 border-dashed border-muted-foreground/30 rounded"
        style={{ 
          width: '453px', 
          height: '242px',
          padding: '8px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div className="h-full flex flex-col text-black" style={{ fontSize: '7px', lineHeight: '1.2' }}>
          {/* Header: Logo + Company + Product */}
          <div className="flex items-center gap-2 pb-1 border-b border-black mb-1">
            <img 
              src={logoImage} 
              alt="Breadshop" 
              className="h-6 w-auto object-contain"
            />
            <div className="flex-1 text-center">
              <div style={{ fontSize: '9px', fontWeight: 'bold' }}>BREADSHOP SAS</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{label.label_title}</div>
            </div>
          </div>

          {/* Main content: 3 columns */}
          <div className="flex-1 flex gap-2 min-h-0">
            {/* Column 1: Ingredients */}
            <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
              <div style={{ fontSize: '6px', fontWeight: 'bold', marginBottom: '2px' }}>{t.ingredientsCaps}</div>
              <div 
                className="overflow-hidden"
                style={{ fontSize: '5.5px', textAlign: 'justify' }}
                dangerouslySetInnerHTML={{ 
                  __html: label.snapshot_ingredients_html || '<em>N/A</em>' 
                }}
              />
              {secondaryAllergens && secondaryAllergens.length > 0 && (
                <div style={{ fontSize: '5px', fontStyle: 'italic', marginTop: '2px' }}>
                  {t.mayContain}: {secondaryAllergens.join(', ')}
                </div>
              )}
            </div>

            {/* Column 2: Nutrition + Conservation */}
            <div className="flex flex-col gap-1" style={{ width: '130px' }}>
              <div>
                <div style={{ fontSize: '6px', fontWeight: 'bold', marginBottom: '1px' }}>{t.nutritionCaps}</div>
                {nutrition ? (
                  <table className="w-full border-collapse" style={{ fontSize: '5px' }}>
                    <tbody>
                      <tr>
                        <td className="border border-black/50 px-0.5">{t.energy}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_energy_kj?.toFixed(0)}kJ/{nutrition.per_100g_energy_kcal?.toFixed(0)}kcal</td>
                      </tr>
                      <tr>
                        <td className="border border-black/50 px-0.5">{t.fat}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_fat?.toFixed(1)}g</td>
                      </tr>
                      <tr>
                        <td className="border border-black/50 px-0.5 pl-2">{t.saturated}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_saturated_fat?.toFixed(1)}g</td>
                      </tr>
                      <tr>
                        <td className="border border-black/50 px-0.5">{t.carbs}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_carbohydrates?.toFixed(1)}g</td>
                      </tr>
                      <tr>
                        <td className="border border-black/50 px-0.5 pl-2">{t.sugars}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_sugars?.toFixed(1)}g</td>
                      </tr>
                      <tr>
                        <td className="border border-black/50 px-0.5">{t.fiber}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_fiber?.toFixed(1)}g</td>
                      </tr>
                      <tr>
                        <td className="border border-black/50 px-0.5">{t.protein}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_protein?.toFixed(1)}g</td>
                      </tr>
                      <tr>
                        <td className="border border-black/50 px-0.5">{t.salt}</td>
                        <td className="border border-black/50 px-0.5 text-right">{nutrition.per_100g_salt?.toFixed(2)}g</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <span style={{ fontSize: '5px' }}>N/A</span>
                )}
              </div>
              
              {/* Storage instructions */}
              {label.snapshot_storage_instructions && (
                <div>
                  <div style={{ fontSize: '5px', fontWeight: 'bold' }}>{t.storageCaps}</div>
                  <div style={{ fontSize: '5px' }}>{label.snapshot_storage_instructions}</div>
                </div>
              )}
              
              {/* Thawing instructions */}
              {label.snapshot_thawing_instructions && (
                <div>
                  <div style={{ fontSize: '5px', fontWeight: 'bold' }}>{t.thawingCaps}</div>
                  <div style={{ fontSize: '5px' }}>{label.snapshot_thawing_instructions}</div>
                </div>
              )}
            </div>

            {/* Column 3: Weight, DDM, Barcode, Triman */}
            <div className="flex flex-col justify-between" style={{ width: '100px' }}>
              {/* Net weight - prominent */}
              <div className="border border-black p-1 text-center">
                <div style={{ fontSize: '5px' }}>{t.netWeightCaps}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1' }}>
                  {label.snapshot_net_weight || '-'} {label.snapshot_net_weight_unit || 'kg'}
                </div>
              </div>

              {/* DDM placeholder */}
              <div className="border border-dashed border-black/50 p-1 text-center" style={{ backgroundColor: '#f5f5f5' }}>
                <div style={{ fontSize: '5px' }}>{t.bestBefore.toUpperCase()}</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999' }}>{t.bestBeforeShort}</div>
                <div style={{ fontSize: '4px', fontStyle: 'italic', color: '#666' }}>{t.toComplete}</div>
              </div>

              {/* Barcode placeholder */}
              <div className="border border-dashed border-black/50 p-1 text-center" style={{ backgroundColor: '#f5f5f5' }}>
                <div className="flex items-center justify-center gap-0.5 h-5">
                  {/* Barcode visual representation */}
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      className="h-full"
                      style={{ width: i % 3 === 0 ? '2px' : '1px', backgroundColor: '#9ca3af' }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '4px', fontStyle: 'italic', color: '#666' }}>{t.barcodeToPrint}</div>
              </div>

              {/* Triman + Recyclable */}
              <div className="flex items-center gap-1">
                <div 
                  className="border border-black flex items-center justify-center"
                  style={{ width: '16px', height: '16px', fontSize: '8px' }}
                >
                  ♻️
                </div>
                <div style={{ fontSize: '5px' }}>
                  {t.recyclable}
                </div>
              </div>
            </div>
          </div>

          {/* Footer: Company info */}
          <div className="pt-1 border-t border-black/30 mt-1 text-center" style={{ fontSize: '5px' }}>
            {t.madeIn}
          </div>
        </div>
      </div>
    </div>
  );
}
