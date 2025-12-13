-- =====================================================
-- Database Schema untuk Fitur Absensi (Tanpa GPS)
-- =====================================================

-- =====================================================
-- 1. Tabel Absensi
-- =====================================================
CREATE TABLE absensi (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Check-in
    check_in_time TIMESTAMPTZ,
    check_in_photo_url TEXT, -- Path ke foto selfie check-in
    check_in_keterangan TEXT, -- WFO, WFH, Dinas Luar, dll
    
    -- Check-out
    check_out_time TIMESTAMPTZ,
    check_out_photo_url TEXT, -- Path ke foto selfie check-out
    
    -- Status
    status TEXT DEFAULT 'hadir', -- hadir, izin, sakit, alpha, cuti
    catatan TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: satu user hanya bisa absen sekali per hari
    UNIQUE(user_id, tanggal)
);

-- Index untuk performa
CREATE INDEX idx_absensi_user_tanggal ON absensi(user_id, tanggal DESC);
CREATE INDEX idx_absensi_tanggal ON absensi(tanggal DESC);
CREATE INDEX idx_absensi_status ON absensi(status);

-- =====================================================
-- 2. Tabel Pengajuan Izin
-- =====================================================
CREATE TABLE pengajuan_izin (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Detail izin
    jenis TEXT NOT NULL, -- izin, sakit, cuti
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jumlah_hari INTEGER NOT NULL,
    alasan TEXT NOT NULL,
    bukti_url TEXT, -- Surat dokter, dll (opsional)
    
    -- Approval
    status TEXT DEFAULT 'pending', -- pending, disetujui, ditolak
    catatan_admin TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_pengajuan_izin_user ON pengajuan_izin(user_id);
CREATE INDEX idx_pengajuan_izin_status ON pengajuan_izin(status);
CREATE INDEX idx_pengajuan_izin_tanggal ON pengajuan_izin(tanggal_mulai DESC);

-- =====================================================
-- 3. Tabel Setting Absensi
-- =====================================================
CREATE TABLE setting_absensi (
    id BIGSERIAL PRIMARY KEY,
    
    -- Jam kerja
    jam_masuk_mulai TIME DEFAULT '07:00:00',
    jam_masuk_selesai TIME DEFAULT '09:00:00',
    jam_pulang_mulai TIME DEFAULT '16:00:00',
    jam_pulang_selesai TIME DEFAULT '18:00:00',
    
    -- Fitur
    require_photo BOOLEAN DEFAULT true, -- Wajib foto saat check-in/out
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO setting_absensi (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. RLS Policies untuk Absensi
-- =====================================================

-- Enable RLS
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan_izin ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_absensi ENABLE ROW LEVEL SECURITY;

-- Policy: User dapat melihat absensi sendiri
CREATE POLICY "Users can view own attendance"
ON absensi FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: User dapat insert absensi sendiri
CREATE POLICY "Users can insert own attendance"
ON absensi FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: User dapat update absensi sendiri (untuk check-out)
CREATE POLICY "Users can update own attendance"
ON absensi FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Admin dapat melihat semua absensi
CREATE POLICY "Admins can view all attendance"
ON absensi FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Policy: Admin dapat update semua absensi
CREATE POLICY "Admins can update all attendance"
ON absensi FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 5. RLS Policies untuk Pengajuan Izin
-- =====================================================

-- Policy: User dapat melihat pengajuan izin sendiri
CREATE POLICY "Users can view own leave requests"
ON pengajuan_izin FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: User dapat insert pengajuan izin sendiri
CREATE POLICY "Users can insert own leave requests"
ON pengajuan_izin FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Admin dapat melihat semua pengajuan izin
CREATE POLICY "Admins can view all leave requests"
ON pengajuan_izin FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Policy: Admin dapat update semua pengajuan izin
CREATE POLICY "Admins can update all leave requests"
ON pengajuan_izin FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 6. RLS Policies untuk Setting Absensi
-- =====================================================

-- Policy: Semua user dapat melihat setting
CREATE POLICY "All users can view settings"
ON setting_absensi FOR SELECT
TO authenticated
USING (true);

-- Policy: Hanya admin yang dapat update setting
CREATE POLICY "Only admins can update settings"
ON setting_absensi FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 7. Functions untuk Absensi
-- =====================================================

-- Function: Get absensi hari ini untuk user
CREATE OR REPLACE FUNCTION get_today_attendance(p_user_id UUID)
RETURNS TABLE (
    id BIGINT,
    tanggal DATE,
    check_in_time TIMESTAMPTZ,
    check_in_photo_url TEXT,
    check_in_keterangan TEXT,
    check_out_time TIMESTAMPTZ,
    check_out_photo_url TEXT,
    status TEXT,
    catatan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.tanggal,
        a.check_in_time,
        a.check_in_photo_url,
        a.check_in_keterangan,
        a.check_out_time,
        a.check_out_photo_url,
        a.status,
        a.catatan
    FROM absensi a
    WHERE a.user_id = p_user_id
    AND a.tanggal = CURRENT_DATE;
END;
$$;

-- Function: Get statistik absensi user per bulan
CREATE OR REPLACE FUNCTION get_attendance_stats(
    p_user_id UUID,
    p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
    total_hadir BIGINT,
    total_izin BIGINT,
    total_sakit BIGINT,
    total_alpha BIGINT,
    total_cuti BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'hadir') as total_hadir,
        COUNT(*) FILTER (WHERE status = 'izin') as total_izin,
        COUNT(*) FILTER (WHERE status = 'sakit') as total_sakit,
        COUNT(*) FILTER (WHERE status = 'alpha') as total_alpha,
        COUNT(*) FILTER (WHERE status = 'cuti') as total_cuti
    FROM absensi
    WHERE user_id = p_user_id
    AND EXTRACT(MONTH FROM tanggal) = p_month
    AND EXTRACT(YEAR FROM tanggal) = p_year;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_today_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_stats TO authenticated;

-- =====================================================
-- 8. Storage Bucket untuk Foto Absensi
-- =====================================================
-- CATATAN: Bucket harus dibuat manual di Supabase Dashboard
-- Nama bucket: 'foto-absensi'
-- Public: NO (private)
-- File size limit: 2 MB
-- Allowed MIME types: image/jpeg, image/png

-- =====================================================
-- Verifikasi Setup
-- =====================================================
-- Jalankan query ini untuk memverifikasi:
-- 
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('absensi', 'pengajuan_izin', 'setting_absensi');
--
-- SELECT policyname FROM pg_policies 
-- WHERE tablename IN ('absensi', 'pengajuan_izin', 'setting_absensi');
-- =====================================================
