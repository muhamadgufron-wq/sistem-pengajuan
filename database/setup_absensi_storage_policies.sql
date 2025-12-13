-- =====================================================
-- Storage Policies untuk Foto Absensi
-- =====================================================
-- 
-- CATATAN: Bucket 'foto-absensi' harus sudah dibuat terlebih dahulu
-- via Supabase Dashboard > Storage > New Bucket
-- 
-- Bucket Configuration:
-- - Name: foto-absensi
-- - Public: NO (private bucket)
-- - File size limit: 2 MB
-- - Allowed MIME types: image/jpeg, image/png
-- =====================================================

-- =====================================================
-- 1. POLICY: User dapat upload foto absensi sendiri
-- =====================================================
CREATE POLICY "Users can upload their own attendance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'foto-absensi' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 2. POLICY: User dapat melihat foto absensi sendiri
-- =====================================================
CREATE POLICY "Users can view their own attendance photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'foto-absensi' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 3. POLICY: Admin dapat melihat semua foto absensi
-- =====================================================
CREATE POLICY "Admins can view all attendance photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'foto-absensi'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 4. POLICY: User dapat update foto absensi sendiri
-- =====================================================
CREATE POLICY "Users can update their own attendance photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'foto-absensi' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'foto-absensi' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 5. POLICY: User dapat delete foto absensi sendiri
-- =====================================================
CREATE POLICY "Users can delete their own attendance photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'foto-absensi' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 6. POLICY: Admin dapat delete semua foto absensi
-- =====================================================
CREATE POLICY "Admins can delete all attendance photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'foto-absensi'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- VERIFIKASI: Cek apakah policies sudah dibuat
-- =====================================================
-- Jalankan query ini untuk memverifikasi:
-- 
-- SELECT 
--   policyname,
--   cmd,
--   roles
-- FROM pg_policies
-- WHERE schemaname = 'storage'
--   AND tablename = 'objects'
--   AND policyname LIKE '%attendance%'
-- ORDER BY policyname;
-- =====================================================
