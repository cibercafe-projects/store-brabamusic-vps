-- Braba Beats — export de migração
-- Gerado automaticamente. Não editar à mão.

-- 06_storage_buckets.sql — os buckets privados do projeto

INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('beat-covers', 'beat-covers', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('beat-licenses', 'beat-licenses', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('beat-previews', 'beat-previews', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('beat-stems', 'beat-stems', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('beat-wav', 'beat-wav', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('producer-avatars', 'producer-avatars', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('purchase-receipts', 'purchase-receipts', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('release-audio', 'release-audio', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('release-covers', 'release-covers', false, NULL)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('release-photos', 'release-photos', false, NULL)
  ON CONFLICT (id) DO NOTHING;
