REVOKE EXECUTE ON FUNCTION public.increment_beat_plays(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_beat_plays(uuid) TO service_role;