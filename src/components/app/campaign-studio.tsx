'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '../icon';
import { createCampaign, deleteAsset, generateCampaign, setAssetStatus } from '@/app/campaigns/actions';
import { generateAssetMedia, refreshAssetMedia } from '@/app/campaigns/media-actions';

const channelOptions = ['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'Email'];
const budgetOptions = [
  { value: 'economy', label: 'Economy', detail: '7 assets — a lighter week' },
  { value: 'balanced', label: 'Balanced', detail: '12 assets — the standard week' },
  { value: 'video_heavy', label: 'Video heavy', detail: '13 assets — video-led week' },
] as const;

export function NewCampaignForm({ audiences }: { audiences: { id: string; name: string }[] }) {
  const [title, setTitle] = useState('');
  const [audienceId, setAudienceId] = useState(audiences[0]?.id ?? '');
  const [budgetMode, setBudgetMode] = useState<'economy' | 'balanced' | 'video_heavy'>('balanced');
  const [channels, setChannels] = useState<string[]>(['YouTube', 'Email']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleChannel(channel: string) {
    setChannels((current) => (current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel]));
  }

  if (!audiences.length) {
    return (
      <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)' }}>
        Campaigns start from an audience decision, and your workspace has no audiences yet. Audiences are created
        during setup — if you skipped that step, your Super Admin can seed them, and this form opens up.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        const result = await createCampaign({ title, audienceId, budgetMode, channels });
        // createCampaign redirects to the new campaign on success; reaching here means an error.
        if (result && !result.ok) {
          setError(result.error);
          setSaving(false);
        }
      }}
    >
      <div className="onb-fields" style={{ maxWidth: 'none' }}>
        <div className="field">
          <label htmlFor="nc-title">Campaign title (optional)</label>
          <input id="nc-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Leave blank and we will name it from the audience" />
        </div>
        <div className="field">
          <label htmlFor="nc-audience">Audience — the one decision everything follows</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {audiences.map((audience) => (
              <button type="button" key={audience.id} className="chip" aria-pressed={audienceId === audience.id} onClick={() => setAudienceId(audience.id)}>
                {audienceId === audience.id && <Icon name="check" width={13} height={13} />}
                {audience.name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Budget mode</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {budgetOptions.map((option) => (
              <button type="button" key={option.value} className="chip" aria-pressed={budgetMode === option.value} onClick={() => setBudgetMode(option.value)}>
                {budgetMode === option.value && <Icon name="check" width={13} height={13} />}
                {option.label} · {option.detail}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Channels</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {channelOptions.map((channel) => (
              <button type="button" key={channel} className="chip" aria-pressed={channels.includes(channel)} onClick={() => toggleChannel(channel)}>
                {channels.includes(channel) && <Icon name="check" width={13} height={13} />}
                {channel}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && (
        <div className="auth-alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 16 }} disabled={saving}>
        <Icon name="sparkles" />
        {saving ? 'Creating…' : 'Create campaign draft'}
      </button>
    </form>
  );
}

export function GeneratePanel({ campaignId, hasAssets }: { campaignId: string; hasAssets: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  async function onGenerate() {
    setRunning(true);
    setError('');
    try {
      const result = await generateCampaign(campaignId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError(
        'The request failed before the Campaign Brain could answer (server error). Your campaign is unchanged — try again, and if it repeats, the platform health panel in Admin will show which provider is down.',
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)', marginTop: 0 }}>
        {hasAssets
          ? 'Regenerate this campaign from its brief and the current Mission Brain. Assets you have already approved are kept; un-approved generated assets are replaced.'
          : 'The Campaign Brain reads your brief, your brand, and the approved Mission Brain, then writes the week: angle, hooks, objections, a Mon–Sun calendar, and the full asset set — every CTA pointing at your destination.'}
      </p>
      {error && (
        <div className="auth-alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <button type="button" className="btn btn-primary btn-lg" onClick={onGenerate} disabled={running}>
        <Icon name="sparkles" />
        {running ? 'Campaign Brain is writing… (30–60s)' : hasAssets ? 'Regenerate campaign' : 'Generate this campaign'}
      </button>
      <p style={{ fontSize: 12.5, color: 'var(--text-4)', marginTop: 10 }}>
        Text generation runs on the house during the founding phase. Credits apply to media generation, which arrives with the Media Studio.
      </p>
    </div>
  );
}

const typeIcons: Record<string, IconName> = {
  social_post: 'send',
  email: 'mail',
  script: 'video',
  image: 'image',
};

export type AssetView = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  channel: string | null;
  status: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaState?: 'processing' | 'ready' | 'failed';
  mediaError?: string;
  mediaCost?: number;
  /** Exact sanitized text the avatar will speak (script assets only). */
  spokenPreview?: string;
};

export type MediaOptions = {
  imageCost: number;
  videoCost: number;
  imageConfigured: boolean;
  videoConfigured: boolean;
  balance: number;
};

export function AssetCard({ asset, mediaOptions }: { asset: AssetView; mediaOptions?: MediaOptions }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError('');
    const result = await fn();
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(result.error ?? 'Something went wrong.');
  }

  const body = asset.body ?? '';
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const scriptSeconds = asset.type === 'script' ? Math.max(10, Math.round(wordCount / 2.5)) : null;

  return (
    <article className="board-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="ichip ichip-sm ichip-blue">
          <Icon name={typeIcons[asset.type] ?? 'layers'} />
        </span>
        <b style={{ fontSize: 14.5 }}>{asset.title ?? 'Untitled asset'}</b>
        <span className="pill" style={{ marginLeft: 'auto' }}>
          {asset.channel ?? '—'}
        </span>
        <span className={`pill ${asset.status === 'approved' ? 'pill-live' : ''}`}>{asset.status}</span>
      </div>

      {asset.type === 'email' ? (
        <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
          {body.split('\n').map((line, index) =>
            line.toLowerCase().startsWith('subject:') ? (
              <div key={index} style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                {line}
              </div>
            ) : (
              <div key={index}>{line}</div>
            ),
          )}
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{body}</div>
      )}

      {(asset.type === 'image' || asset.type === 'script') && mediaOptions && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          {asset.type === 'script' && asset.spokenPreview && asset.mediaState !== 'ready' && asset.mediaState !== 'processing' && (
            <div style={{ marginBottom: 12, background: 'var(--surface-2, rgba(127,127,127,0.08))', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                What the avatar will say
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', margin: '6px 0 0' }}>{asset.spokenPreview}</p>
              <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '6px 0 0' }}>
                Section labels, stage directions and links are stripped automatically — this is the exact text sent to the avatar.
              </p>
            </div>
          )}
          {asset.mediaState === 'ready' && asset.mediaUrl ? (
            asset.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.mediaUrl} alt={asset.title ?? 'Generated image'} style={{ width: '100%', borderRadius: 12, display: 'block' }} />
            ) : (
              <video
                src={asset.mediaUrl}
                poster={asset.thumbnailUrl ?? undefined}
                controls
                preload="metadata"
                style={{ width: '100%', borderRadius: 12, display: 'block', background: '#000' }}
              />
            )
          ) : asset.mediaState === 'processing' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="pill pill-live">
                <span className="dot" /> Generating {asset.type === 'image' ? 'image' : 'video'}…
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                {asset.type === 'image' ? 'Usually under a minute.' : 'Avatar videos take a few minutes.'} Your {asset.mediaCost ?? ''} credits are charged only when it finishes.
              </span>
              <button type="button" className="btn btn-sm" disabled={busy} onClick={() => act(() => refreshAssetMedia(asset.id))}>
                Refresh status
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                disabled={
                  busy ||
                  (asset.type === 'image' ? !mediaOptions.imageConfigured : !mediaOptions.videoConfigured) ||
                  mediaOptions.balance < (asset.type === 'image' ? mediaOptions.imageCost : mediaOptions.videoCost)
                }
                onClick={() => act(() => generateAssetMedia(asset.id))}
              >
                <Icon name={asset.type === 'image' ? 'image' : 'video'} />
                Generate {asset.type === 'image' ? 'image' : 'avatar video'} · {asset.type === 'image' ? mediaOptions.imageCost : mediaOptions.videoCost} credits
              </button>
              {(asset.type === 'image' ? !mediaOptions.imageConfigured : !mediaOptions.videoConfigured) ? (
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Media studio opens soon — provider connection in setup.</span>
              ) : mediaOptions.balance < (asset.type === 'image' ? mediaOptions.imageCost : mediaOptions.videoCost) ? (
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  Needs {asset.type === 'image' ? mediaOptions.imageCost : mediaOptions.videoCost} credits — balance is {mediaOptions.balance}. <a href="/credits">Top up</a>
                </span>
              ) : asset.mediaState === 'failed' ? (
                <span style={{ fontSize: 12.5, color: 'var(--magenta, #f43f5e)' }}>Last attempt failed{asset.mediaError ? `: ${asset.mediaError}` : ''} — nothing was charged.</span>
              ) : (
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Charged only on success — failures cost nothing.</span>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {scriptSeconds && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>≈ {scriptSeconds}s spoken</span>}
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{wordCount} words</span>
        <span style={{ flex: 1 }} />
        {asset.status !== 'approved' ? (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(() => setAssetStatus(asset.id, 'approved'))}>
            <Icon name="check" />
            Approve
          </button>
        ) : (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => act(() => setAssetStatus(asset.id, 'ready'))}>
            Return to review
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(() => deleteAsset(asset.id))}>
          Discard
        </button>
      </div>
      {error && (
        <div className="auth-alert" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </article>
  );
}
