-- =====================================================
-- Setup Script for Multiple Proof Upload Feature
-- Table: bukti_laporan_files
-- =====================================================
-- This script creates a new table to store multiple proof files
-- for money usage reports (laporan penggunaan uang)
-- =====================================================

-- Create table for storing multiple proof files
CREATE TABLE IF NOT EXISTS bukti_laporan_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pengajuan_uang_id BIGINT NOT NULL REFERENCES pengajuan_uang(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries by pengajuan_uang_id
CREATE INDEX IF NOT EXISTS idx_bukti_laporan_pengajuan 
  ON bukti_laporan_files(pengajuan_uang_id);

-- Add index for faster queries by created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_bukti_laporan_created 
  ON bukti_laporan_files(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on the table
ALTER TABLE bukti_laporan_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own files
CREATE POLICY "Users can view own bukti files"
  ON bukti_laporan_files FOR SELECT
  USING (
    pengajuan_uang_id IN (
      SELECT id FROM pengajuan_uang WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own files
CREATE POLICY "Users can insert own bukti files"
  ON bukti_laporan_files FOR INSERT
  WITH CHECK (
    pengajuan_uang_id IN (
      SELECT id FROM pengajuan_uang WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own bukti files"
  ON bukti_laporan_files FOR DELETE
  USING (
    pengajuan_uang_id IN (
      SELECT id FROM pengajuan_uang WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view all files
CREATE POLICY "Admins can view all bukti files"
  ON bukti_laporan_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these queries to verify the setup:
--
-- 1. Check if table exists:
--    SELECT * FROM bukti_laporan_files LIMIT 1;
--
-- 2. Check indexes:
--    SELECT indexname, indexdef 
--    FROM pg_indexes 
--    WHERE tablename = 'bukti_laporan_files';
--
-- 3. Check RLS policies:
--    SELECT policyname, cmd, qual 
--    FROM pg_policies 
--    WHERE tablename = 'bukti_laporan_files';
-- =====================================================
