-- Add attachment columns to transactions table
-- This allows users to attach photos/receipts to their transactions

-- Add attachment_url column to store the Supabase Storage URL
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Add attachment metadata columns for better file management
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Create storage bucket for transaction attachments (Run this in Supabase Dashboard SQL Editor)
-- Note: This requires superuser privileges, so it should be run manually in Supabase Dashboard

INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-attachments', 'transaction-attachments', false);

Set up storage policies to allow authenticated users to upload and view their own attachments
CREATE POLICY "Users can upload own attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
