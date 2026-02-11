import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'PERPLEXITY_API_KEY not set', keyLength: 0 });
  }

  const keyInfo = {
    length: apiKey.length,
    prefix: apiKey.substring(0, 8),
    suffix: apiKey.substring(apiKey.length - 4),
    hasQuotes: apiKey.includes('"') || apiKey.includes("'"),
    hasSpaces: apiKey.includes(' '),
    hasNewlines: apiKey.includes('\n') || apiKey.includes('\r'),
  };

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'user', content: 'What is 2+2?' }
        ],
        max_tokens: 50,
      }),
    });

    const status = res.status;
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    
    let body;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      body = await res.json();
    } else {
      const text = await res.text();
      body = text.substring(0, 500);
    }

    return NextResponse.json({
      keyInfo,
      response: { status, headers, body },
    });
  } catch (err: any) {
    return NextResponse.json({
      keyInfo,
      error: err.message,
    });
  }
}
