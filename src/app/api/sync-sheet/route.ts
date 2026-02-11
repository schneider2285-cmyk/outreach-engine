import { NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const ACCOUNT_ID = 'a1b2c3d4-1111-4000-8000-000000000001';

interface SheetContact {
    name: string;
    title: string;
    location: string;
    tier: string;
    initiative: string;
    status: string;
    channel: string;
}

function parseTierToSeniority(tier: string): string {
    switch (tier?.toUpperCase()) {
        case 'T0': return 'C-Suite';
        case 'T1': return 'C-Suite';
        case 'T2': return 'VP';
        case 'T3': return 'Director';
        default: return 'Manager';
    }
}

function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let current = '';
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                row.push(current);
                current = '';
            } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
                if (ch === '\r') i++;
                row.push(current);
                current = '';
                if (row.length > 1 || row[0] !== '') rows.push(row);
                row = [];
            } else {
                current += ch;
            }
        }
    }
    row.push(current);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
}

export async function POST() {
    try {
        if (!SHEET_ID) {
            return NextResponse.json({ error: 'GOOGLE_SHEET_ID not configured' }, { status: 500 });
        }

        const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Outreach%20Tracker&range=A5:X100`;

        const response = await fetch(csvUrl, { cache: 'no-store' });
        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch sheet: ${response.status} ${response.statusText}` },
                { status: 500 }
            );
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        if (rows.length < 2) {
            return NextResponse.json({ error: 'No data rows found in sheet' }, { status: 400 });
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h === 'name');
        const titleIdx = headers.findIndex(h => h === 'title');
        const locationIdx = headers.findIndex(h => h === 'location');
        const tierIdx = headers.findIndex(h => h === 'tier');
        const initiativeIdx = headers.findIndex(h => h === 'initiative');
        const statusIdx = headers.findIndex(h => h.includes('status'));
        const channelIdx = headers.findIndex(h => h === 'channel');

        if (nameIdx === -1) {
            return NextResponse.json(
                { error: 'Could not find Name column in sheet headers: ' + headers.join(', ') },
                { status: 400 }
            );
        }

        const contacts: SheetContact[] = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const name = row[nameIdx]?.trim();
            if (!name) continue;

            contacts.push({
                name,
                title: titleIdx >= 0 ? row[titleIdx]?.trim() || '' : '',
                location: locationIdx >= 0 ? row[locationIdx]?.trim() || '' : '',
                tier: tierIdx >= 0 ? row[tierIdx]?.trim() || '' : '',
                initiative: initiativeIdx >= 0 ? row[initiativeIdx]?.trim() || '' : '',
                status: statusIdx >= 0 ? row[statusIdx]?.trim() || '' : '',
                channel: channelIdx >= 0 ? row[channelIdx]?.trim() || '' : '',
            });
        }

        if (contacts.length === 0) {
            return NextResponse.json({ message: 'No contacts found in sheet', synced: 0 });
        }

        let synced = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const contact of contacts) {
            const { data: existing } = await supabase
                .from('prospects')
                .select('id')
                .eq('tenant_id', TENANT_ID)
                .eq('name', contact.name)
                .maybeSingle();

            if (existing) {
                skipped++;
                continue;
            }

            const statusMap: Record<string, string> = {
                'researching': 'researching',
                'draft ready': 'draft_ready',
                'sent': 'sent',
                'replied': 'replied',
                'meeting': 'meeting_booked',
                'meeting booked': 'meeting_booked',
                'no response': 'sent',
                'declined': 'sent',
            };

            const mappedStatus = statusMap[contact.status.toLowerCase()] || 'researching';

            const { error } = await supabase.from('prospects').insert({
                tenant_id: TENANT_ID,
                account_id: ACCOUNT_ID,
                name: contact.name,
                title: contact.title,
                seniority: parseTierToSeniority(contact.tier),
                status: mappedStatus,
                priority_score: contact.tier === 'T0' ? 95 : contact.tier === 'T1' ? 85 : contact.tier === 'T2' ? 70 : 55,
                notes: [contact.initiative, contact.location, contact.channel].filter(Boolean).join(' | '),
            });

            if (error) {
                errors.push(`Failed to insert ${contact.name}: ${error.message}`);
            } else {
                synced++;
            }
        }

        return NextResponse.json({
            message: `Sync complete: ${synced} added, ${skipped} already existed`,
            synced,
            skipped,
            total: contacts.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
    }
}
