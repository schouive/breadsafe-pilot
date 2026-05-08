UPDATE label_templates
SET zpl_content =
  E'CT~~CD,~CC^~CT~\n' ||
  E'^XA~TA000~JSN^LT0^MNW^MTD^PON^PMN^LH0,0^JMA^PR4,4~SD15^JUS^LRN^CI0^XZ\n' ||
  E'^XA\n^MMT\n^PW800\n^LL480\n^LS0\n' ||
  E'^FO15,8^GFA,2850,2850,25,' ||
    substring(zpl_content from '\^GFA,2850,2850,25,([0-9A-F]+)\^FS') ||
  E'^FS\n' ||
  E'^FT225,60^A0N,42,40^FH\\^FD{{DESIGNATION}}^FS\n' ||
  E'^FO140,95^GB650,0,4^FS\n' ||
  E'^FO540,5^GB255,82,4^FS\n' ||
  E'^FT630,30^A0N,20,20^FH\\^FDPOIDS NET^FS\n' ||
  E'^FT575,75^A0N,55,50^FH\\^FD{{POIDS_NET}}^FS\n' ||
  E'^FT15,120^A0N,24,22^FH\\^FDIngredients :^FS\n' ||
  E'^FT15,148^A0N,24,22^FH\\^FD{{INGR_L1}}^FS\n' ||
  E'^FT15,176^A0N,24,22^FH\\^FD{{INGR_L2}}^FS\n' ||
  E'^FT15,204^A0N,24,22^FH\\^FD{{INGR_L3}}^FS\n' ||
  E'^FT15,232^A0N,24,22^FH\\^FD{{INGR_L4}}^FS\n' ||
  E'^FT15,260^A0N,24,22^FH\\^FD{{INGR_L5}}^FS\n' ||
  E'^FT15,288^A0N,24,22^FH\\^FD{{INGR_L6}}^FS\n' ||
  E'^FT15,313^A0N,22,20^FH\\^FD{{TRACES}}^FS\n' ||
  E'^FT15,338^A0N,22,20^FH\\^FD{{STORAGE_L1}}^FS\n' ||
  E'^FT15,360^A0N,22,20^FH\\^FD{{STORAGE_L2}}^FS\n' ||
  E'^FT15,388^A0N,22,20^FH\\^FDValeurs nutritionnelles pour 100g :^FS\n' ||
  E'^FT15,410^A0N,22,20^FH\\^FD{{NUTRI_L1}}^FS\n' ||
  E'^FT15,430^A0N,22,20^FH\\^FD{{NUTRI_L2}}^FS\n' ||
  E'^FT15,450^A0N,22,20^FH\\^FD{{NUTRI_L3}}^FS\n' ||
  E'^FT15,470^A0N,22,20^FH\\^FD{{NUTRI_L4}}^FS\n' ||
  E'^FT540,110^A0N,20,18^FH\\^FDA consommer de preference^FS\n' ||
  E'^FT540,135^A0N,20,18^FH\\^FDavant le :^FS\n' ||
  E'^FT660,135^A0N,28,26^FH\\^FD{{DDM_J}} {{DDM_YY}}^FS\n' ||
  E'^FT540,175^A0N,28,26^FH\\^FDLot : L{{LOT}}^FS\n' ||
  E'^FO540,195^GB255,75,3^FS\n' ||
  E'^FT555,225^A0N,22,20^FH\\^FDCarton et sachet^FS\n' ||
  E'^FT555,255^A0N,22,20^FH\\^FDrecyclables^FS\n' ||
  E'^BY2,3,55^FT555,470^BCN,,Y,N^FD>;{{BARCODE}}^FS\n' ||
  E'^PQ{{QTY}},0,1,Y^XZ'
WHERE template_code = 'PRODUCT_LABEL';