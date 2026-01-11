-- Permettre la suppression des contrôles par l'opérateur qui l'a créé ou les admins/quality
CREATE POLICY "Users can delete their own control records"
ON public.control_records
FOR DELETE
USING (
  auth.uid() = operator_id 
  OR has_role(auth.uid(), 'quality_assistant'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Permettre la suppression des relevés de température
CREATE POLICY "Users can delete their own temperature records"
ON public.storage_temperature_records
FOR DELETE
USING (
  auth.uid() = operator_id 
  OR has_role(auth.uid(), 'quality_assistant'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);