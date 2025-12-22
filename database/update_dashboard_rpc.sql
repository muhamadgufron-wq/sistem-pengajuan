-- Update RPC function untuk include reimbursement dalam total uang diajukan
-- Jalankan di Supabase SQL Editor

-- Drop existing function
DROP FUNCTION IF EXISTS get_dashboard_stat_cards();

-- Create updated function with table aliases to avoid ambiguity
CREATE OR REPLACE FUNCTION get_dashboard_stat_cards()
RETURNS TABLE (
  barang_minggu_ini BIGINT,
  uang_minggu_ini BIGINT,
  jumlah_disetujui BIGINT,
  total_karyawan BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Pengajuan Barang minggu ini
    (SELECT COUNT(*) 
     FROM pengajuan_barang 
     WHERE created_at >= date_trunc('week', NOW())
       AND created_at < date_trunc('week', NOW()) + INTERVAL '1 week'
    )::BIGINT,
    
    -- Pengajuan Uang minggu ini (termasuk reimbursement)
    (
      (SELECT COUNT(*) 
       FROM pengajuan_uang 
       WHERE created_at >= date_trunc('week', NOW())
         AND created_at < date_trunc('week', NOW()) + INTERVAL '1 week'
      ) +
      (SELECT COUNT(*) 
       FROM pengajuan_reimbursement 
       WHERE created_at >= date_trunc('week', NOW())
         AND created_at < date_trunc('week', NOW()) + INTERVAL '1 week'
      )
    )::BIGINT,
    
    -- Total Uang yang Disetujui minggu ini (pengajuan_uang + reimbursement)
    (
      COALESCE(
        (SELECT SUM(COALESCE(pu.jumlah_disetujui, pu.jumlah_uang))
         FROM pengajuan_uang pu
         WHERE pu.status = 'disetujui'
           AND pu.created_at >= date_trunc('week', NOW())
           AND pu.created_at < date_trunc('week', NOW()) + INTERVAL '1 week'
        ), 0
      ) +
      COALESCE(
        (SELECT SUM(COALESCE(pr.jumlah_disetujui, pr.jumlah_uang))
         FROM pengajuan_reimbursement pr
         WHERE pr.status = 'disetujui'
           AND pr.created_at >= date_trunc('week', NOW())
           AND pr.created_at < date_trunc('week', NOW()) + INTERVAL '1 week'
        ), 0
      )
    )::BIGINT,
    
    -- Total Karyawan
    (SELECT COUNT(*) FROM profiles WHERE role = 'user')::BIGINT;
END;
$$;

-- Test the function
SELECT * FROM get_dashboard_stat_cards();
