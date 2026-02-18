-- Create the photos storage bucket (public, 50MB max file size)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photos', 'photos', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files (public bucket)
CREATE POLICY "Public read photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Allow anyone to upload files (anon key used by client)
CREATE POLICY "Allow photo uploads" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos');

-- Allow anyone to update files
CREATE POLICY "Allow photo updates" ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos');

-- Allow anyone to delete files (for admin cleanup)
CREATE POLICY "Allow photo deletes" ON storage.objects FOR DELETE
  USING (bucket_id = 'photos');
