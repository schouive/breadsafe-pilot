-- Update PRODUCT_LABEL ZPL template with logos and new layout
DO $$
DECLARE
  v_zpl text;
BEGIN
  v_zpl := pg_read_file('/tmp/product-zpl.txt');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;