
CREATE POLICY "Clinic members can read patient photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patient-photos' AND is_clinic_member(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "Clinic members can upload patient photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-photos' AND is_clinic_member(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "Clinic members can delete patient photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'patient-photos' AND is_clinic_member(((storage.foldername(name))[1])::uuid, auth.uid()));
