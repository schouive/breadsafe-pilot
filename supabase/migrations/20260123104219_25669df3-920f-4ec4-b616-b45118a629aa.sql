-- Add status column to storage_temperature_records to support conforme/acceptable/nonconforme
ALTER TABLE public.storage_temperature_records 
ADD COLUMN status TEXT NOT NULL DEFAULT 'conforme' 
CHECK (status IN ('conforme', 'acceptable', 'nonconforme'));

-- Update existing records based on is_conforme (set to conforme or nonconforme)
UPDATE public.storage_temperature_records 
SET status = CASE WHEN is_conforme THEN 'conforme' ELSE 'nonconforme' END;