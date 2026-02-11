import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
export const TENANT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
