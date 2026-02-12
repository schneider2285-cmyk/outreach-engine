'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function ProspectDetail() {
  const params = useParams();
  const [prospect, setProspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);

  // LinkedIn upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch(`/api/prospects/${params.id}`)
      .then(r => r.json())
      .then(d => { setProspect(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadDrafts = () => {
    fetch(`/api/prospects/${params.id}/drafts/generate`)
      .then(r => r.json())
      .then(d => { if (d.drafts) setDrafts(d.drafts); })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    loadDrafts();
  }, [params.id]);

  const runResearch = async (tier: string) => {
    setResearching(true);
    setResearchResult(null);
    try {
      const res = await fetch(`/api/prospects/${params.id}/research/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      setResearchResult(data);
      load();
    } catch (err: any) {
      setResearchResult({ error: err.message });
    }
    setResearching(false);
  };

  const generateDrafts = async (channel: string = 'email') => {
    setDrafting(true);
    setDraftResult(null);
    try {
      const res = await fetch(`/api/prospects/${params.id}/drafts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, variants: 3 }),
      });
      const data = await res.json();
      setDraftResult(data);
      if (data.drafts) setDrafts(data.drafts);
      load();
    } catch (err: any) {
      setDraftResult({ error: err.message });
    }
    setDrafting(false);
  };

  // LinkedIn upload handler
  const handleLinkedInUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/prospects/${params.id}/linkedin-upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadResult(data);
      load();
    } catch (err: any) {
      setUploadResult({ error: err.message });
    }
    setUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLinkedInUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLinkedInUpload(file);
  };

  const logOutcome = async (outcomeType: string) => {
    await fetch(`/api/prospects/${params.id}/outcomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome_type: outcomeType }),
    });
    load();
  };

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!prospect) return <div className="p-8 text-red-400">Prospect not found</div>;

  const statusColor: Record<string, string> = {
    new: 'bg-blue-600',
    researched: 'bg-green-600',
    drafted: 'bg-purple-600',
    contacted: 'bg-yellow-600',
    engaged: 'bg-emerald-600',
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <a href="/prospects" className="text-gray-400 hover:text-white text-sm">Back</a>

      <div className="flex items-start justify-between mt-2">
        <div>
          <h1 className="text-3xl font-bold">{prospect.full_name}</h1>
          <p className="text-gray-400 mt-1">{prospect.title} - {(prospect.accounts as any)?.name || 'Unknown'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor[prospect.status] || 'bg-gray-600'}`}>
          {prospect.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="font-bold text-lg mb-3">Profile</h2>
          <div className="space-y-2 text-sm">
            {prospect.location && <div className="flex justify-between"><span className="text-gray-400">Location</span><span>{prospect.location}</span></div>}
            {prospect.seniority && <div className="flex justify-between"><span className="text-gray-400">Seniority</span><span>{prospect.seniority}</span></div>}
            {prospect.bu_hypothesis && <div className="flex justify-between"><span className="text-gray-400">BU Hypothesis</span><span>{prospect.bu_hypothesis}</span></div>}
            {prospect.raw_linkedin_text && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <span className="text-green-400 text-xs font-bold">LinkedIn Data Available</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="font-bold text-lg mb-2">Research</h2>
          <p className="text-gray-400 text-sm mb-3">Run Perplexity-powered research on this prospect.</p>
          <div className="flex gap-2">
            {['quick', 'standard', 'deep'].map(tier => (
              <button key={tier} onClick={() => runResearch(tier)} disabled={researching}
                className="flex-1 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 rounded-lg py-2 text-sm font-bold capitalize">
                {tier}<br /><span className="text-xs font-normal text-gray-300">{tier === 'quick' ? '2' : tier === 'standard' ? '5' : '10'} Searches</span>
              </button>
            ))}
          </div>
          {researching && <p className="text-yellow-400 text-sm mt-2 animate-pulse">Researching...</p>}
          {researchResult && (
            <div className={`mt-2 p-2 rounded text-sm ${researchResult.error ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
              {researchResult.error || `Done: ${researchResult.searches} searches, ${researchResult.evidence_count} evidence items, ${researchResult.cost_estimate}`}
            </div>
          )}
          {prospect.research_runs?.length > 0 && (
            <div className="mt-3 text-xs text-gray-400">
              <p className="font-bold">History</p>
              {prospect.research_runs.map((r: any) => (
                <div key={r.id} className="flex justify-between mt-1">
                  <span>{r.tier} - {r.search_count} searches</span>
                  <span>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LinkedIn Profile Upload Section */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
        <h2 className="font-bold text-lg mb-2">LinkedIn Profile</h2>
        <p className="text-gray-400 text-sm mb-3">
          Upload a screenshot or PDF of the prospect's LinkedIn profile for deeper analysis.
          The file is processed and immediately discarded — never stored.
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-900/20'
              : 'border-gray-600 hover:border-gray-400 hover:bg-gray-700/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading ? (
            <div className="text-blue-400 animate-pulse">
              <p className="text-lg font-bold">Extracting profile data...</p>
              <p className="text-sm mt-1">Claude is analyzing the LinkedIn profile</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">📄</div>
              <p className="text-gray-300 font-medium">Drop LinkedIn profile here or click to upload</p>
              <p className="text-gray-500 text-xs mt-1">Supports PDF, PNG, JPEG, WEBP, GIF</p>
            </div>
          )}
        </div>
        {uploadResult && (
          <div className={`mt-3 p-3 rounded text-sm ${
            uploadResult.error ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
          }`}>
            {uploadResult.error
              ? uploadResult.error
              : `Extracted ${uploadResult.artifacts_saved} profile sections (${uploadResult.extracted_fields?.join(', ')}) — ${uploadResult.cost_estimate}`
            }
          </div>
        )}
        {prospect.raw_linkedin_text && (
          <div className="mt-3 text-xs text-gray-500">
            LinkedIn data on file (last uploaded). Will be used in draft generation.
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
        <h2 className="font-bold text-lg mb-2">Draft Outreach</h2>
        <p className="text-gray-400 text-sm mb-3">Generate personalized outreach drafts using Claude AI. Requires research first.</p>
        <div className="flex gap-2">
          <button onClick={() => generateDrafts('email')} disabled={drafting || prospect.status === 'new'}
            className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg py-2 px-6 text-sm font-bold">
            Generate Email Drafts
          </button>
          <button onClick={() => generateDrafts('linkedin')} disabled={drafting || prospect.status === 'new'}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg py-2 px-6 text-sm font-bold">
            Generate LinkedIn Drafts
          </button>
        </div>
        {prospect.status === 'new' && <p className="text-yellow-500 text-xs mt-2">Run research first before generating drafts.</p>}
        {drafting && <p className="text-purple-400 text-sm mt-2 animate-pulse">Generating drafts... (extracting profile, writing variants, scoring...)</p>}
        {draftResult?.error && <p className="text-red-400 text-sm mt-2">{draftResult.error}</p>}
        {draftResult?.status === 'completed' && (
          <div className="mt-2 p-2 rounded text-sm bg-purple-900/50 text-purple-300">
            {draftResult.drafts_count} drafts generated - {draftResult.artifacts_count} profile artifacts - {draftResult.cost_estimate}
          </div>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
          <h2 className="font-bold text-lg mb-4">Drafts ({drafts.length})</h2>
          <div className="space-y-4">
            {drafts.map((draft: any) => (
              <div key={draft.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-700 px-2 py-0.5 rounded text-xs font-bold">V{draft.variant_number}</span>
                    <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{draft.hook_type}</span>
                    <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{draft.channel}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {draft.open_score && <span title="Open Score" className="text-green-400">O:{draft.open_score}</span>}
                    {draft.read_score && <span title="Read Score" className="text-blue-400">R:{draft.read_score}</span>}
                    {draft.reply_score && <span title="Reply Score" className="text-purple-400">Re:{draft.reply_score}</span>}
                    <span className={draft.claims_audit_passed ? 'text-green-400' : 'text-red-400'}>
                      {draft.claims_audit_passed ? 'Claims OK' : 'Claims Flag'}
                    </span>
                  </div>
                </div>
                {draft.subject && <p className="text-yellow-300 text-sm font-bold mb-1">Subject: {draft.subject}</p>}
                <p className="text-gray-200 text-sm whitespace-pre-wrap">{draft.body}</p>
                <p className="text-gray-500 text-xs mt-2">Angle: {draft.angle} | CTA: {draft.cta_type} | Length: {draft.length_bucket}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
        <h2 className="font-bold text-lg mb-2">Log Outcome</h2>
        <div className="flex flex-wrap gap-2">
          {['positive', 'neutral', 'objection', 'no_reply', 'referral', 'not_relevant'].map(o => (
            <button key={o} onClick={() => logOutcome(o)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm capitalize">
              {o.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {prospect.web_evidence?.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
          <h2 className="font-bold text-lg mb-3">Evidence ({prospect.web_evidence.length})</h2>
          <div className="space-y-3 text-sm">
            {prospect.web_evidence.map((e: any) => (
              <div key={e.id}>
                <p className="text-blue-400">{e.source_url}</p>
                <p className="text-gray-400 mt-1">{e.snippet?.substring(0, 200)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
