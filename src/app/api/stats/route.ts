import { NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

export async function GET() {
  const { count: accountCount } = await supabase
    .from('accounts').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID);

  const { count: prospectCount } = await supabase
    .from('prospects').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID);

  const { count: draftedCount } = await supabase
    .from('prospects').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID)
    .in('status', ['drafted', 'contacted', 'engaged']);

  const { count: contactedCount } = await supabase
    .from('prospects').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID)
    .in('status', ['contacted', 'engaged']);

  const { data: recentProspects } = await supabase
    .from('prospects').select('*, accounts!inner(name)').eq('tenant_id', TENANT_ID)
    .order('updated_at', { ascending: false }).limit(5);

  const { data: accounts } = await supabase
    .from('accounts').select('*').eq('tenant_id', TENANT_ID).order('name');

  const { data: prospectsByAccount } = await supabase
    .from('prospects').select('account_id').eq('tenant_id', TENANT_ID);

  const countMap: Record<string, number> = {};
  prospectsByAccount?.forEach(p => { countMap[p.account_id] = (countMap[p.account_id] || 0) + 1; });

  return NextResponse.json({
    accounts: accountCount || 0,
    prospects: prospectCount || 0,
    drafted: draftedCount || 0,
    contacted: contactedCount || 0,
    recent_prospects: recentProspects?.map(p => ({
      ...p, account_name: (p.accounts as any)?.name || '', accounts: undefined,
    })) || [],
    account_list: accounts?.map(a => ({ ...a, prospect_count: countMap[a.id] || 0 })) || [],
  });
}
