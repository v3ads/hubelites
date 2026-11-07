'use client';

import { useState, useTransition } from 'react';
import { createPresenter } from './actions';

export function CreatePresenterButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createPresenter();
            if (!result.ok) setError(result.error ?? 'Presenter creation failed.');
          })
        }
      >
        {pending ? 'Creating…' : 'Create the AI presenter'}
      </button>
      {error ? (
        <p style={{ marginTop: 10, fontSize: 13, color: 'var(--magenta, #f43f5e)' }}>{error}</p>
      ) : null}
    </div>
  );
}
