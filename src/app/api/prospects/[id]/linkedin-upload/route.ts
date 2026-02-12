import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

// POST /api/prospects/[id]/linkedin-upload
// Accepts a LinkedIn profile as PDF or image (screenshot),
// uses Claude Vision to extract structured data,
// saves artifacts to DB, then discards the file (never stored).

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  // 1. Verify prospect exists
  const { data: prospect, error: pErr } = await supabase
    .from('prospects')
    .select('*, accounts!inner(name)')
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (pErr || !prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  // 2. Parse the uploaded file from FormData
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const allowedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Upload a PDF, PNG, JPEG, WEBP, or GIF.' },
      { status: 400 }
    );
  }

  // 3. Convert file to base64 for Claude Vision API
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  // Determine media type for Claude
  let mediaType = file.type;
  if (mediaType === 'application/pdf') {
    mediaType = 'application/pdf';
  }

  const accountName = (prospect.accounts as any)?.name || '';

  try {
    // 4. Send to Claude Vision for extraction
    // For PDFs, Claude supports document understanding directly
    // For images, Claude uses vision capabilities
    const isPdf = file.type === 'application/pdf';

    const contentBlock = isPdf
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf',
            data: base64Data,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: file.type,
            data: base64Data,
          },
        };

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are an expert at extracting structured professional data from LinkedIn profiles.
Extract all available information and return valid JSON only — no markdown, no explanation.
Be thorough: capture every detail visible in the profile.`,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: `This is the LinkedIn profile of ${prospect.full_name} (${prospect.title || 'Unknown title'}) at ${accountName}.

Extract ALL information visible in this profile and return a JSON object with these fields:

{
  "headline": "their LinkedIn headline",
  "summary": "their About/summary section text",
  "current_role": {
    "title": "",
    "company": "",
    "duration": "",
    "description": ""
  },
  "experience": [
    {
      "title": "",
      "company": "",
      "duration": "",
      "description": ""
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "field": "",
      "years": ""
    }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": ["cert1", "cert2"],
  "languages": ["lang1", "lang2"],
  "interests_and_activities": ["item1", "item2"],
  "recommendations_summary": "brief summary if visible",
  "posts_and_activity": "brief summary of recent posts/activity if visible",
  "connections_info": "number of connections if visible",
  "key_talking_points": [
    "insight that could be used in outreach",
    "another insight"
  ],
  "raw_text": "full plain text extraction of everything visible"
}

Return ONLY the JSON object. Include empty strings or arrays for fields not visible in the profile.`,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content?.[0]?.text || '';
    const usage = claudeData.usage;

    // 5. Parse the extracted data
    let extracted: Record<string, any>;
    try {
      const cleaned = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = { raw_text: responseText };
    }

    // 6. Save raw LinkedIn text to prospect record (temporary enrichment)
    const rawText = extracted.raw_text || responseText;
    await supabase
      .from('prospects')
      .update({
        raw_linkedin_text: rawText.substring(0, 10000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    // 7. Save structured artifacts to profile_artifacts table
    const artifactsToSave = [];

    if (extracted.current_role || extracted.headline) {
      artifactsToSave.push({
        artifact_type: 'linkedin_role',
        content: {
          headline: extracted.headline,
          current_role: extracted.current_role,
        },
      });
    }

    if (extracted.experience?.length > 0) {
      artifactsToSave.push({
        artifact_type: 'linkedin_experience',
        content: { experience: extracted.experience },
      });
    }

    if (extracted.education?.length > 0) {
      artifactsToSave.push({
        artifact_type: 'linkedin_education',
        content: { education: extracted.education },
      });
    }

    if (extracted.skills?.length > 0) {
      artifactsToSave.push({
        artifact_type: 'linkedin_skills',
        content: { skills: extracted.skills },
      });
    }

    if (extracted.summary) {
      artifactsToSave.push({
        artifact_type: 'linkedin_summary',
        content: { summary: extracted.summary },
      });
    }

    if (extracted.key_talking_points?.length > 0) {
      artifactsToSave.push({
        artifact_type: 'linkedin_talking_points',
        content: { talking_points: extracted.key_talking_points },
      });
    }

    if (extracted.posts_and_activity) {
      artifactsToSave.push({
        artifact_type: 'linkedin_activity',
        content: { activity: extracted.posts_and_activity },
      });
    }

    // Delete any previous linkedin artifacts for this prospect
    await supabase
      .from('profile_artifacts')
      .delete()
      .eq('prospect_id', params.id)
      .eq('tenant_id', TENANT_ID)
      .like('artifact_type', 'linkedin_%');

    // Insert new artifacts
    for (const artifact of artifactsToSave) {
      await supabase.from('profile_artifacts').insert({
        tenant_id: TENANT_ID,
        prospect_id: params.id,
        artifact_type: artifact.artifact_type,
        content: artifact.content,
        source: 'linkedin_upload',
      });
    }

    // 8. Also save key insights derived from LinkedIn
    if (extracted.key_talking_points?.length > 0) {
      await supabase.from('insights').insert({
        tenant_id: TENANT_ID,
        prospect_id: params.id,
        insight_type: 'linkedin_intelligence',
        content: {
          talking_points: extracted.key_talking_points,
          headline: extracted.headline,
          summary_excerpt: extracted.summary?.substring(0, 500),
        },
        confidence: 'high',
      });
    }

    // Cost estimate (Claude Sonnet pricing)
    const inputCost = (usage?.input_tokens || 0) * 0.003 / 1000;
    const outputCost = (usage?.output_tokens || 0) * 0.015 / 1000;
    const totalCost = inputCost + outputCost;

    // File is never stored — it only existed in memory during this request
    return NextResponse.json({
      status: 'completed',
      prospect_id: params.id,
      artifacts_saved: artifactsToSave.length,
      extracted_fields: Object.keys(extracted).filter(k => {
        const v = extracted[k];
        return v && (typeof v === 'string' ? v.length > 0 : Array.isArray(v) ? v.length > 0 : true);
      }),
      usage,
      cost_estimate: `$${totalCost.toFixed(4)}`,
    });
  } catch (err: any) {
    console.error('LinkedIn upload extraction error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
