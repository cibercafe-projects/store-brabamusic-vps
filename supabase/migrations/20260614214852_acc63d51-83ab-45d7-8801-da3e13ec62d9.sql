INSERT INTO public.app_settings (key, value)
VALUES ('admin_notification_email', '')
ON CONFLICT (key) DO NOTHING;