'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icon';
import { saveDestination } from '@/app/dashboard/actions';

export function DestinationForm({ initialUrl = '' }: { initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');
        const result = await saveDestination(url);
        setSaving(false);
        if (result.ok) {
          setMessage('Destination saved. Every CTA HubElites writes will point here.');
          router.refresh();
        } else {
          setError(result.error);
        }
      }}
    >
      <div className="field">
        <label htmlFor="destination-url">Your Mission 1000 destination</label>
        <input
          id="destination-url"
          placeholder="https://yourdomain.com/mission1000"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <span className="field-hint">Use your own Ambassador domain, not a shared link.</span>
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
      <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={saving}>
        <Icon name="link" />
        {saving ? 'Saving…' : initialUrl ? 'Update destination' : 'Save destination'}
      </button>
    </form>
  );
}
