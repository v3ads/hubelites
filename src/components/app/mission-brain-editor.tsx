'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icon';
import { deleteMissionBrainItem, saveMissionBrainItem } from '@/app/admin/mission-brain/actions';

export type MissionBrainItemView = {
  id: string;
  key: string;
  category: string;
  title: string;
  text: string;
  status: string;
  updated_at: string;
};

const categories = ['positioning', 'offer', 'claims', 'restrictions', 'cta', 'faq'];

export function MissionBrainEditor({ items }: { items: MissionBrainItemView[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'retired'>('draft');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function loadItem(item: MissionBrainItemView) {
    setSelectedId(item.id);
    setKey(item.key);
    setCategory(item.category);
    setTitle(item.title);
    setText(item.text);
    setStatus((item.status as 'draft' | 'active' | 'retired') ?? 'draft');
    setMessage('');
    setError('');
  }

  function resetForm() {
    setSelectedId(null);
    setKey('');
    setCategory(categories[0]);
    setTitle('');
    setText('');
    setStatus('draft');
    setMessage('');
    setError('');
  }

  async function onSave() {
    setSaving(true);
    setMessage('');
    setError('');
    const result = await saveMissionBrainItem({
      id: selectedId ?? undefined,
      key,
      category,
      title,
      text,
      status,
    });
    setSaving(false);
    if (result.ok) {
      setMessage('Saved. Active items are served to the Campaign Brain on the next generation.');
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function onDelete() {
    if (!selectedId) return;
    setSaving(true);
    const result = await deleteMissionBrainItem(selectedId);
    setSaving(false);
    if (result.ok) {
      resetForm();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const grouped = categories
    .map((cat) => ({ category: cat, rows: items.filter((item) => item.category === cat) }))
    .filter((group) => group.rows.length > 0);
  const otherRows = items.filter((item) => !categories.includes(item.category));
  if (otherRows.length) grouped.push({ category: 'other', rows: otherRows });

  return (
    <div className="cols">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Approved knowledge</h2>
            <p>{items.length} items. Only Active items reach campaign generation.</p>
          </div>
          <button type="button" className="btn btn-sm" onClick={resetForm}>
            <Icon name="plus" />
            New item
          </button>
        </div>
        <div className="rows">
          {grouped.map((group) => (
            <div key={group.category}>
              <div className="side-section" style={{ padding: '12px 16px 4px' }}>
                {group.category}
              </div>
              {group.rows.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="row-item"
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                  onClick={() => loadItem(item)}
                >
                  <span className={`ichip ichip-sm ${item.status === 'active' ? 'ichip-emerald' : item.status === 'retired' ? 'ichip-amber' : 'ichip-violet'}`}>
                    <Icon name="brain" />
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <small>
                      {item.key} · {item.status}
                    </small>
                  </div>
                  <Icon name="arrow" width={16} height={16} />
                </button>
              ))}
            </div>
          ))}
          {items.length === 0 && (
            <p style={{ padding: 16, fontSize: 14, color: 'var(--text-3)' }}>
              No Mission Brain items yet. Create the first one — the Campaign Brain has nothing approved to work from until you do.
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{selectedId ? 'Edit item' : 'New item'}</h2>
            <p>Write it the way campaigns should say it. The engine quotes this, it does not improvise positioning.</p>
          </div>
          <span className={`pill ${status === 'active' ? 'pill-live' : ''}`}>{status}</span>
        </div>
        <div className="panel-body">
          <div className="onb-fields" style={{ maxWidth: 'none' }}>
            <div className="two">
              <div className="field">
                <label htmlFor="mb-key">Key</label>
                <input id="mb-key" value={key} onChange={(event) => setKey(event.target.value)} placeholder="primary-cta" />
              </div>
              <div className="field">
                <label htmlFor="mb-category">Category</label>
                <input id="mb-category" value={category} onChange={(event) => setCategory(event.target.value)} list="mb-categories" />
                <datalist id="mb-categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="field">
              <label htmlFor="mb-title">Title</label>
              <input id="mb-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What this item is" />
            </div>
            <div className="field">
              <label htmlFor="mb-text">Content</label>
              <textarea
                id="mb-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                placeholder="The approved wording, facts, or restriction…"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div className="field">
              <label htmlFor="mb-status">Status</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['draft', 'active', 'retired'] as const).map((option) => (
                  <button
                    type="button"
                    key={option}
                    className="chip"
                    aria-pressed={status === option}
                    onClick={() => setStatus(option)}
                  >
                    {status === option && <Icon name="check" width={13} height={13} />}
                    {option}
                  </button>
                ))}
              </div>
              <span className="field-hint">Draft = saved but not served. Active = served to generation. Retired = kept for history, not served.</span>
            </div>
          </div>

          {error && (
            <div className="auth-alert" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
          {message && (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-2)' }}>
              <Icon name="check" width={14} height={14} /> {message}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
              <Icon name="check" />
              {saving ? 'Saving…' : selectedId ? 'Save changes' : 'Create item'}
            </button>
            {selectedId && (
              <button type="button" className="btn btn-ghost" onClick={onDelete} disabled={saving}>
                Delete item
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
