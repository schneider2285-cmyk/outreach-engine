import { NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || '';
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A1:Z500';

interface SheetContact {
    name: string;
    title: string;
    location: string;
    tier: string;
    initiative: string;
    status: string;
    department: string;
    channel: string;
}

function parseTierToSeniority(tier: string): string {
    switch (tier?.toUpperCase()) {
      case 'T0': return 'C-Suite';
      case 'T1': return 'C-Suite';
      case 'T2': return 'VP';
      case 'T3': return 'Director';
      default: return 'Unknown';
    }
}

function parseTierToPersona(tier: string): string {
    switch (tier?.toUpperCase()) {
      case 'T0': return 'executive_sponsor';
      case 'T1': return 'economic_buyer';
      case 'T2': return 'economic_buyer';
      case 'T3': return 'technical_buyer';
      default: return 'influencer';
    }
}

function mapSheetStatus(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('responded') || s.includes('engaged')) return 'contacted';
    if (s.includes('outreach sent') || s.includes('sent')) return 'contacted';
    if (s.includes('researched') || s.includes('drafted')) return 'researched';
    return 'new';
}

// POST /api/sync-sheet — Pull contacts from Google Sheet into Supabase
export async function POST() {
    try {
          if (!GOOGLE_SHEETS_API_KEY || !SHEET_ID) {
                  return NextResponse.json(
                    { error: 'Google Sheets API key or Sheet ID not configured. Add GOOGLE_SHEETS_API_KEY and GOOGLE_SHEET_ID to environment variables.' },
                    { status: 500 }
                          );
          }

      // Fetch data from Google Sheets API
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${GOOGLE_SHEETS_API_KEY}`;
          const sheetRes = await fetch(url);

      if (!sheetRes.ok) {
              const errText = await sheetRes.text();
              return NextResponse.json(
                { error: `Failed to fetch Google Sheet: ${sheetRes.status} — ${errText}` },
                { status: 500 }
                      );
      }

      const sheetData = await sheetRes.json();
          const rows = sheetData.values || [];

      if (rows.length < 2) {
              return NextResponse.json({ error: 'Sheet is empty or has no data rows' }, { status: 400 });
      }

      // Parse headers (first row)
      const headers = rows[0].map((h: string) => h?.toLowerCase().trim());
          const dataRows = rows.slice(1);

      // Map column indices
      const colMap: Record<string, number> = {};
          headers.forEach((h: string, i: number) => {
                  if (h.includes('name') && !h.includes('account')) colMap.name = i;
                  if (h.includes('title') || h.includes('role')) colMap.title = i;
                  if (h.includes('location') || h.includes('loc')) colMap.location = i;
                  if (h.includes('tier')) colMap.tier = i;
                  if (h.includes('initiative') || h.includes('init')) colMap.initiative = i;
                  if (h.includes('status')) colMap.status = i;
                  if (h.includes('department') || h.includes('dept')) colMap.department = i;
                  if (h.includes('channel') || h.includes('chan')) colMap.channel = i;
                  if (h.includes('email')) colMap.email = i;
                  if (h.includes('linkedin')) colMap.linkedin = i;
                  if (h.includes('phone')) colMap.phone = i;
          });

      if (colMap.name === undefined) {
              return NextResponse.json(
                { error: 'Could not find a "Name" column in the sheet. Ensure your sheet has a header row with a Name column.' },
                { status: 400 }
                      );
      }

      // Get or create default account (Schneider Electric)
      let { data: account } = await supabase
            .from('accounts')
            .select('id')
            .eq('tenant_id', TENANT_ID)
            .limit(1)
            .single();

      if (!account) {
              const { data: newAccount } = await supabase
                .from('accounts')
                .insert({
                            tenant_id: TENANT_ID,
                            name: 'Schneider Electric',
                            domain: 'se.com',
                            industry: 'Industrial Automation / Energy Management',
                            hq_location: 'Rueil-Malmaison, France',
                            employee_count: '150,000+',
                })
                .select()
                .single();
              account = newAccount;
      }

      if (!account) {
              return NextResponse.json({ error: 'Could not find or create account' }, { status: 500 });
      }

      // Parse contacts from sheet
      const contacts: SheetContact[] = [];
          for (const row of dataRows) {
                  const name = row[colMap.name]?.trim();
                  if (!name) continue;

            contacts.push({
                      name,
                      title: row[colMap.title]?.trim() || '',
                      location: row[colMap.location]?.trim() || '',
                      tier: row[colMap.tier]?.trim() || '',
                      initiative: row[colMap.initiative]?.trim() || '',
                      status: row[colMap.status]?.trim() || '',
                      department: row[colMap.department]?.trim() || '',
                      channel: row[colMap.channel]?.trim() || '',
            });
          }

      // Upsert contacts into Supabase
      let inserted = 0;
          let updated = 0;
          let skipped = 0;

      for (const contact of contacts) {
              // Check if prospect already exists (by name + account)
            const { data: existing } = await supabase
                .from('prospects')
                .select('id, status')
                .eq('tenant_id', TENANT_ID)
                .eq('account_id', account.id)
                .eq('full_name', contact.name)
                .single();

            if (existing) {
                      // Update if there are meaningful changes
                const { error: updateErr } = await supabase
                        .from('prospects')
                        .update({
                                      title: contact.title || undefined,
                                      location: contact.location || undefined,
                                      seniority: contact.tier ? parseTierToSeniority(contact.tier) : undefined,
                                      department: contact.department || undefined,
                                      bu_hypothesis: contact.initiative || undefined,
                                      persona_segment: contact.tier ? parseTierToPersona(contact.tier) : undefined,
                                      updated_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id);

                if (!updateErr) updated++;
                      else skipped++;
            } else {
                      // Insert new prospect
                const { error: insertErr } = await supabase
                        .from('prospects')
                        .insert({
                                      tenant_id: TENANT_ID,
                                      account_id: account.id,
                                      full_name: contact.name,
                                      title: contact.title,
                                      location: contact.location,
                                      seniority: parseTierToSeniority(contact.tier),
                                      department: contact.department,
                                      status: mapSheetStatus(contact.status),
                                      persona_segment: parseTierToPersona(contact.tier),
                                      bu_hypothesis: contact.initiative,
                        });

                if (!insertErr) inserted++;
                      else skipped++;
            }
      }

      return NextResponse.json({
              success: true,
              summary: {
                        total_in_sheet: contacts.length,
                        inserted,
                        updated,
                        skipped,
              },
      });
    } catch (err: any) {
          return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
    }
}

// GET /api/sync-sheet — Check sync status / configuration
export async function GET() {
    const configured = Boolean(GOOGLE_SHEETS_API_KEY && SHEET_ID);

  const { count } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID);

  return NextResponse.json({
        configured,
        current_prospects: count || 0,
        sheet_id: SHEET_ID ? `...${SHEET_ID.slice(-8)}` : null,
  });
}
