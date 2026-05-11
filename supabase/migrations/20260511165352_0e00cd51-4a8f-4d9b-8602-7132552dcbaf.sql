UPDATE public.label_templates
SET zpl_content = replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(zpl_content,
                    '^FO15,100^GB1170,0,6^FS', '^FO15,120^GB1170,0,6^FS'),
                  '^FO765,115^GB420,135,4^FS', '^FO765,135^GB420,135,4^FS'),
                '^FT900,151^A0N,27,27^FH\^FDPOIDS NET^FS', '^FT900,171^A0N,27,27^FH\^FDPOIDS NET^FS'),
              '^FT810,238^A0N,82,75^FH\^FD{{POIDS_NET}}^FS', '^FT810,258^A0N,82,75^FH\^FD{{POIDS_NET}}^FS'),
            '^FO765,272^GB420,142,4^FS', '^FO765,292^GB420,142,4^FS'),
          '^FT780,310^A0N,30,27^FH\^FDA consommer de preference^FS', '^FT780,330^A0N,30,27^FH\^FDA consommer de preference^FS'),
        '^FT780,355^A0N,36,33^FH\^FDavant le : {{DDM_FR}}^FS', '^FT780,375^A0N,36,33^FH\^FDavant le : {{DDM_FR}}^FS'),
      '^FT780,403^A0N,39,36^FH\^FDLot : L{{LOT}}^FS', '^FT780,423^A0N,39,36^FH\^FDLot : L{{LOT}}^FS'),
    '^FT810,454^A0N,27,27^FH\^FDCarton et sachet^FS', '^FT810,474^A0N,27,27^FH\^FDCarton et sachet^FS'),
  '^FO795,517^BCN,82,Y,N^FD>;{{BARCODE}}^FS', '^FO795,537^BCN,82,Y,N^FD>;{{BARCODE}}^FS')
WHERE template_code = 'PRODUCT_LABEL';