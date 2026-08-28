-- Migration: Add KYC verification fields to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_ifsc text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_registration_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gst_certificate_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status text CHECK (kyc_status IN ('not_submitted','pending','verified','rejected')) DEFAULT 'not_submitted';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_reviewed_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_reviewed_by uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_rejection_reason text;
