// Perplexity Search API client
// Tier configs: quick (2 searches), standard (5), deep (10)

interface PerplexityResponse {
  id: string;
  choices: { message: { content: string } }[];
  citations?: string[];
}

interface SearchResult {
  query: string;
  content: string;
  citations: string[];
}

const TIER_CONFIG = {
  quick: { searches: 2, model: 'sonar' },
  standard: { searches: 5, model: 'sonar-pro' },
  deep: { searches: 10, model: 'sonar-pro' },
} as const;

export type ResearchTier = keyof typeof TIER_CONFIG;

export function getTierConfig(tier: ResearchTier) {
  return TIER_CONFIG[tier];
}

export async function perplexitySearch(query: string, model: string = 'sonar'): Promise<SearchResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant. Provide factual, concise information with specific details like dates, numbers, and names. Focus on recent and relevant information.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 1024,
      return_citations: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Perplexity API error ${res.status}: ${errText}`);
  }

  const data: PerplexityResponse = await res.json();
  return {
    query,
    content: data.choices?.[0]?.message?.content || '',
    citations: data.citations || [],
  };
}

// Generate search queries for a prospect based on tier
export function generateSearchQueries(
  prospectName: string,
  prospectTitle: string | undefined,
  accountName: string,
  tier: ResearchTier
): string[] {
  const queries: string[] = [];
  const config = TIER_CONFIG[tier];

  // Quick: basic person + company
  queries.push(`${prospectName} ${accountName} ${prospectTitle || ''} role responsibilities`);
  queries.push(`${accountName} recent news digital transformation hiring 2025 2026`);

  if (config.searches <= 2) return queries.slice(0, config.searches);

  // Standard: add initiative-specific and industry queries
  queries.push(`${prospectName} LinkedIn conference speaking publications`);
  queries.push(`${accountName} technology strategy partnerships consulting`);
  queries.push(`${accountName} ${prospectTitle?.includes('SAP') ? 'SAP ERP migration' : prospectTitle?.includes('AI') ? 'AI machine learning' : 'digital transformation'} initiatives`);

  if (config.searches <= 5) return queries.slice(0, config.searches);

  // Deep: comprehensive research
  queries.push(`${prospectName} career history background`);
  queries.push(`${accountName} organizational structure leadership team`);
  queries.push(`${accountName} talent acquisition workforce strategy freelance`);
  queries.push(`${accountName} competitors market position challenges`);
  queries.push(`${accountName} earnings revenue growth strategy 2025 2026`);

  return queries.slice(0, config.searches);
}
