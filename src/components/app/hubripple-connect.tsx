'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icon';
import { disconnectHubRipple, saveHubRippleConnection } from '@/app/dashboard/distribution-actions';

export function HubRippleConnect({
  connected,
  label = '',
  keySaved,
}: {
  connected: boolean;
  label?: string;
  keySaved: boolean;
}) {
  const router = useRouter();
  const [workspaceLabel, setWorkspaceLabel] = useState(label);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setMessage('');
          setError('');
          const result = await saveHubRippleConnection(workspaceLabel, apiKey);
          setSaving(false);
          if (result.ok) {
            setApiKey('');
            setMessage('HubRipple connection saved. Queued posts will publish through your HubRipple workspace.');
            router.refresh();
          } else {
            setError(result.error);
          }
        }}
      >
        <div className="field">
          <label htmlFor="hubripple-label">HubRipple workspace name</label>
          <input
            id="hubripple-label"
            placeholder="e.g. My HubRipple workspace"
            value={workspaceLabel}
            onChange={(event) => setWorkspaceLabel(event.target.value)}
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="hubripple-key">HubRipple workspace key</label>
          <input
            id="hubripple-key"
            type="password"
            autoComplete="off"
            placeholder={keySaved ? '•••••••••• saved — leave empty to keep it' : 'Paste your workspace key'}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <span className="field-hint">
            {keySaved
              ? 'A key is saved for this workspace. It is stored server-side only and never shown again.'
              : 'Stored server-side only, never shown again. Find it in your HubRipple workspace settings.'}
          </span>
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
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Icon name="link" />
            {saving ? 'Saving…' : connected ? 'Update connection' : 'Connect HubRipple'}
          </button>
          {connected && (
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setMessage('');
                setError('');
                const result = await disconnectHubRipple();
                setSaving(false);
                if (result.ok) {
                  setMessage('HubRipple disconnected. Queued posts stay queued but will not send.');
                  router.refresh();
                } else {
                  setError(result.error);
                }
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
