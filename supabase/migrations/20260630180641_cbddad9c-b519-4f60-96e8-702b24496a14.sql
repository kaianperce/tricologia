REVOKE EXECUTE ON FUNCTION public.bootstrap_clinic(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bootstrap_clinic(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_clinic_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_clinic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_clinic_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;