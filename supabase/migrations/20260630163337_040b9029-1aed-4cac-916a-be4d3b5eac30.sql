
-- RLS policies for anamnesis-attachments bucket: clinic members only
-- Path convention: {clinic_id}/{patient_id}/{filename}

CREATE POLICY "Clinic members can read anamnesis attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'anamnesis-attachments'
  AND public.is_clinic_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Clinic members can upload anamnesis attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'anamnesis-attachments'
  AND public.is_clinic_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Clinic members can delete anamnesis attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'anamnesis-attachments'
  AND public.is_clinic_member(((storage.foldername(name))[1])::uuid, auth.uid())
);
