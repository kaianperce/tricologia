GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_clinic_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_clinic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_clinic(text) TO anon;