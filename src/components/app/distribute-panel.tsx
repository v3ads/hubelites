'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icon';
import { PLATFORMS, platformsForAsset, type PlatformId } from '@/lib/distribution';
import { cancelPublication, createPublication, sendPublicationNow } from '@/app/campaigns/[id]/distribute-actions';

export type DistributableAsset = {
  id: string;
  title: string | null;
  type: string;
  body: string | null;
  hasMedia: boolean;
};

export type PublicationView = {
  id: string;
  assetTitle: string | null;
  platforms: string[];
  linkSlug: string;
  status: string;
  scheduledAt: string | null;
  clicks: number;
  crawlerClicks: number;
  error: string | null;
  publishedUrls: Record<string, string>;
};

const APP_URL = 'https://www.hubelites.com';

function AssetDistributeRow({ campaignId, asset }: { campaignId: string; asset: DistributableAsset }) {
  const router = useRouter();
  const fits = platformsForAsset(asset.type, asset.hasMedia);
  const [selected, setSelected] = useState<PlatformId[]>(fits.slice(0, 3));
  const [caption, setCaption] = useState(asset.body ?? '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 14 }}>{asset.title || 'Untitled asset'}</b>
        <button type="button" className="btn" onClick={() => setOpen((value) => !value)}>
          <Icon name="send" />
          {open ? 'Close' : 'Distribute'}
        </button>
      </div>
      {open && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setMessage('');
            setError('');
            const result = await createPublication({
              campaignId,
              assetId: asset.id,
              platforms: selected,
              caption,
              scheduledAt: scheduledAt || null,
            });
            setBusy(false);
            if (result.ok) {
              setMessage('Queued. Your tracked link is live below — the post sends through HubRipple at its scheduled time.');
              router.refresh();
            } else {
              setError(result.error);
            }
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {PLATFORMS.filter((platform) => fits.includes(platform.id)).map((platform) => {
              const active = selected.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  className={`pill ${active ? 'pill-live' : ''}`}
                  aria-pressed={active}
                  onClick={() =>
                    setSelected((current) =>
                      active ? current.filter((id) => id !== platform.id) : [...current, platform.id],
                    )
                  }
                >
                  {platform.label}
                </button>
              );
            })}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor={`caption-${asset.id}`}>Caption</label>
            <textarea
              id={`caption-${asset.id}`}
              rows={4}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
            <span className="field-hint">Your tracked Mission 1000 link is added as the final line automatically.</span>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor={`schedule-${asset.id}`}>Send at (optional)</label>
            <input
              id={`schedule-${asset.id}`}
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
          {error && (
            <div className="auth-alert" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}
          {message && (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>
              <Icon name="check" width={14} height={14} /> {message}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || selected.length === 0}>
            <Icon name="send" />
            {busy ? 'Queueing…' : 'Queue for publishing'}
          </button>
        </form>
      )}
    </div>
  );
}

export function DistributionPanel({
  campaignId,
  assets,
  publications,
  connected,
  hasDestination,
}: {
  campaignId: string;
  assets: DistributableAsset[];
  publications: PublicationView[];
  connected: boolean;
  hasDestination: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {!connected && (
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0 }}>
          HubRipple is not connected yet — connect it in the Publishing panel on your dashboard. You can still queue
          posts and copy their tracked links; they will send once HubRipple is connected.
        </p>
      )}
      {!hasDestination && (
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0 }}>
          Set your Mission 1000 destination on the dashboard first — every tracked link points there.
        </p>
      )}
      {assets.map((asset) => (
        <AssetDistributeRow key={asset.id} campaignId={campaignId} asset={asset} />
      ))}
      {publications.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: '6px 0 0', fontSize: 14 }}>Queued &amp; published</h3>
          {publications.map((publication) => (
            <div
              key={publication.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: 13.5 }}>
                <b>{publication.assetTitle || 'Asset'}</b>{' '}
                <span style={{ color: 'var(--text-3)' }}>
                  · {publication.platforms.join(', ')}
                  {publication.scheduledAt ? ` · ${new Date(publication.scheduledAt).toLocaleString()}` : ' · as soon as possible'}
                </span>
                <div style={{ fontFamily: 'monospace', fontSize: 12.5, marginTop: 2 }}>
                  {APP_URL}/r/{publication.linkSlug}
                </div>
                {Object.entries(publication.publishedUrls).length > 0 && (
                  <div style={{ fontSize: 12.5, marginTop: 2 }}>
                    {Object.entries(publication.publishedUrls).map(([platform, url]) => (
                      <span key={platform} style={{ marginRight: 10 }}>
                        {platform}:{' '}
                        <a href={url} target="_blank" rel="noreferrer">
                          view post ↗
                        </a>
                      </span>
                    ))}
                  </div>
                )}
                {publication.error && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>{publication.error}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="pill">{publication.clicks} clicks</span>
                {publication.crawlerClicks > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-4)' }}>+{publication.crawlerClicks} previews &amp; bots</span>
                )}
                <span className={`pill ${publication.status === 'published' ? 'pill-live' : ''}`}>{publication.status}</span>
                {publication.status === 'queued' && connected && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busyId === publication.id}
                    onClick={async () => {
                      setBusyId(publication.id);
                      await sendPublicationNow(campaignId, publication.id);
                      setBusyId(null);
                      router.refresh();
                    }}
                  >
                    Send now
                  </button>
                )}
                {publication.status === 'queued' && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === publication.id}
                    onClick={async () => {
                      setBusyId(publication.id);
                      await cancelPublication(campaignId, publication.id);
                      setBusyId(null);
                      router.refresh();
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
