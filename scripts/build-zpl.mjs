import fs from 'fs';

const logos = JSON.parse(fs.readFileSync('/tmp/zpl-logos.json', 'utf8'));

// Layout positions (label PW=1205 LL=791, paysage)
// - Breadshop : top-left, 200x114, ^FO20,8
// - Triman    : dans la box recyclage 90x90, ^FO970,555
// - Recycle   : à droite du Triman 90x78, ^FO1075,560
const tpl = `CT~~CD,~CC^~CT~
^XA~TA000~JSN^LT0^MNW^MTD^PON^PMN^LH0,0^JMA^PR4,4~SD15^JUS^LRN^CI0^XZ
^XA
^MMT
^PW1205
^LL791
^LS0
^FO20,8${logos.BREADSHOP.gfa}^FS
^FT338,84^A0N,67,64^FH\\^FD{{DESIGNATION}}^FS
^FO230,135^GB948,0,12^FS
^FO768,148^GB409,173,12^FS
^FT886,197^A0N,25,24^FH\\^FDPOIDS NET^FS
^BY4,3,134^FT806,748^BCN,,Y,N
^FD>;{{BARCODE}}^FS
^FT12,210^A0N,38,36^FH\\^FD{{INGR_L1}}^FS
^FT12,256^A0N,38,38^FH\\^FD{{INGR_L2}}^FS
^FT12,296^A0N,38,38^FH\\^FD{{INGR_L3}}^FS
^FT12,342^A0N,38,38^FH\\^FD{{INGR_L4}}^FS
^FT12,388^A0N,38,38^FH\\^FD{{INGR_L5}}^FS
^FT12,434^A0N,38,38^FH\\^FD{{INGR_L6}}^FS
^FT12,480^A0N,38,38^FH\\^FD{{TRACES}}^FS
^FT12,626^A0N,38,38^FH\\^FD{{NUTRI_L1}}^FS
^FT12,672^A0N,38,38^FH\\^FD{{NUTRI_L2}}^FS
^FT12,714^A0N,38,38^FH\\^FD{{NUTRI_L3}}^FS
^FT12,760^A0N,38,38^FH\\^FD{{NUTRI_L4}}^FS
^FT838,282^A0N,92,84^FH\\^FD{{POIDS_NET}}^FS
^FT960,440^A0N,46,42^FH\\^FD{{DDM_J}} {{DDM_YY}}^FS
^FT890,505^A0N,50,46^FH\\^FDL{{LOT}}^FS
^FT12,166^A0N,38,36^FH\\^FDIngredients :^FS
^FT12,588^A0N,38,38^FH\\^FDValeurs nutritionnelles pour 100g :^FS
^FT797,391^A0N,38,26^FH\\^FDA consommer de preference^FS
^FT797,440^A0N,38,26^FH\\^FDavant le :^FS
^FT797,505^A0N,46,43^FH\\^FDLot :^FS
^FO768,545^GB409,170,12^FS
^FT783,605^A0N,29,28^FH\\^FDCarton et sachet^FS
^FT783,645^A0N,29,28^FH\\^FDrecyclables^FS
^FO970,555${logos.TRIMAN.gfa}^FS
^FO1075,560${logos.RECYCLE.gfa}^FS
^FT12,488^A0N,38,36^FH\\^FD{{STORAGE_L1}}^FS
^FT12,534^A0N,38,36^FH\\^FD{{STORAGE_L2}}^FS
^PQ{{QTY}},0,1,Y^XZ`;

fs.writeFileSync('/tmp/full-zpl.txt', tpl);
console.error('ZPL length:', tpl.length);
