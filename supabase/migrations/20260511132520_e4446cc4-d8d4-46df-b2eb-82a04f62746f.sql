UPDATE public.label_templates
SET zpl_content = replace(
  replace(
    zpl_content,
    '^FT18,378^A0N,36,33^FH\^FDAllergene(s) : {{ALLERGENES}}^FS
',
    ''
  ),
  '^FT18,414^A0N,36,33^FH\^FDTrace(s) : {{TRACES}}^FS',
  '^FT18,414^A0N,36,33^FH\^FD{{TRACES}}^FS'
)
WHERE template_code = 'PRODUCT_LABEL';