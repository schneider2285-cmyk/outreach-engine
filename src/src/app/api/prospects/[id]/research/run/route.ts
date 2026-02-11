import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';
import { perplexitySearch, generateSearchQueries, getTierConfig, ResearchTier } from '@/lib/perplexity';

// POST /api/prospects/[id]/research/run
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const tier: ResearchTier = body.tier || 'quick';
  const config = getTierConfig(tier);

  // Get prospect + account info
  const { data: prospect, error: pErr } = await supabase
    .from('prospects')
    .select('*, accounts!inner(name)')
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (pErr || !prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  const accountName = (prospect.accounts as any)?.name || '';

  // Create research run record
  const { data: run, error: rErr } = await supabase
    .from('research_runs')
    .insert({
      tenant_id: TENANT_ID,
      prospect_id: params.id,
      tier,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (rErr || !run) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
  }

  try {
    // Generate search queries based on tier
    const queries = generateSearchQueries(
      prospect.full_name,
      prospect.title,
      accountName,
      tier
    );

    const results = [];
    let totalTokens = 0;

    // Execute searches
    for (const query of queries) {
      try {
        const result = await perplexitySearch(query, config.model);
        results.push(result);
        totalTokens += result.content.length / 4; // rough token estimate

        // Store web evidence
        for (const citation of result.citations) {
          await supabase.from('web_evidence').insert({
            tenant_id: TENANT_ID,
            research_run_id: run.id,
            prospect_id: params.id,
            source_url: citation,
            source_title: citation,
            snippet: result.content.substring(0, 500),
            search_query: query,
            relevance_score: 0.8,
          });
        }

        // Store the full search result as evidence too
        await supabase.from('web_evidence').insert({
          tenant_id: TENANT_ID,
          research_run_id: run.id,
          prospect_id: params.id,
          source_url: `perplexity://${query}`,
          source_title: `Search: ${query}`,
          snippet: result.content,
          search_query: query,
          relevance_score: 0.9,
        });
      } catch (searchErr) {
        console.error(`Search failed for "${query}":`, searchErr);
      }
    }

    // Generate insights from combined results
    const combinedContent = results.map(r => r.content).join('\n\n');
    
    if (combinedContent) {
      // Role summary insight
      await supabase.from('insights').insert({
        tenant_id: TENANT_ID,
        prospect_id: params.id,
        research_run_id: run.id,
        insight_type: 'role_summary',
        content: { summary: combinedContent.substring(0, 2000) },
        confidence: tier === 'deep' ? 'high' : tier === 'standard' ? 'medium' : 'low',
      });
    }

    // Cost estimate (rough: sonar ~$0.001/query, sonar-pro ~$0.005/query)
    const costPerQuery = config.model === 'sonar-pro' ? 0.005 : 0.001;
    const cost = queries.length * costPerQuery;

    // Update run as completed
    await supabase
      .from('research_runs')
      .update({
        status: 'completed',
        search_count: queries.length,
        token_count: Math.round(totalTokens),
        cost_estimate_usd: cost,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    // Update prospect status
    await supabase
      .from('prospects')
      .update({ status: 'researched', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    return NextResponse.json({
      run_id: run.id,
      tier,
      searches: queries.length,
      results_count: results.length,
      evidence_count: results.reduce((sum, r) => sum + r.citations.length + 1, 0),
      cost_estimate: `$${cost.toFixed(4)}`,
      status: 'completed',
    });
  } catch (err: any) {
    // Mark run as failed
    await supabase
      .from('research_runs')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', run.id);

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
