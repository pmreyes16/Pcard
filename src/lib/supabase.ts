import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuspqjialyzpxgegjsgy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1c3BxamlhbHl6cHhnZWdqc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDEzNDAsImV4cCI6MjA3NTA3NzM0MH0.ywITnSRgbMxCBlDhQSzEj5TmM_cbeLTKExO3KtAdmD8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface BusinessCard {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile_phone?: string;
  company?: string;
  job_title?: string;
  address?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  profile_picture_url?: string;
  company_logo_url?: string;
  bio?: string;
  theme_color: string;
  is_public: boolean;
  slug?: string;
  qr_code_url?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_expires_at?: string;
  total_cards_created: number;
  total_views_received: number;
  created_at: string;
  updated_at: string;
}

export interface CardView {
  id: string;
  card_id: string;
  viewer_ip?: string;
  viewer_user_agent?: string;
  referrer?: string;
  country?: string;
  city?: string;
  viewed_at: string;
}

export interface CardContact {
  id: string;
  card_id: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  message?: string;
  is_saved: boolean;
  contacted_at: string;
}

export interface CardTemplate {
  id: string;
  name: string;
  description?: string;
  preview_image_url?: string;
  template_data: Record<string, any>;
  is_premium: boolean;
  category: string;
  created_at: string;
}

export interface CardShare {
  id: string;
  card_id: string;
  share_method: 'email' | 'sms' | 'social' | 'qr' | 'link';
  shared_to?: string;
  shared_at: string;
}

