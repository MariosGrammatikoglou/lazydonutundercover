'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateLobbyClient({
  defaultUsername,
}: {
  defaultUsername: string;
}) {
  const router = useRouter();
  const [civilians, setCivilians] = useState(3);
  const [undercovers, setUndercovers] = useState(1);
  const [mrWhites, setMrWhites] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const total = civilians + undercovers + mrWhites;

  async function handleCreate() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/create-lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: defaultUsername,
          civilians,
          undercovers,
          mrWhites,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create lobby');
      } else {
        alert(`Your host code (keep this safe): ${data.hostCode}`);
        try {
          localStorage.setItem(
            `hostCode:${data.lobbyCode}`,
            String(data.hostCode)
          );
        } catch {
          // ignore
        }
        router.push(
          `/lobby/${data.lobbyCode}?playerId=${encodeURIComponent(
            data.playerId
          )}`
        );
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Create Lobby</h2>
      <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>
        Host: <strong>{defaultUsername || 'Host'}</strong>
      </p>

      <div className="form-group">
        <label>Civilians</label>
        <input
          type="number"
          min={0}
          value={civilians}
          onChange={(e) => setCivilians(Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label>Undercovers</label>
        <input
          type="number"
          min={0}
          value={undercovers}
          onChange={(e) => setUndercovers(Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label>Mr Whites</label>
        <input
          type="number"
          min={0}
          value={mrWhites}
          onChange={(e) => setMrWhites(Number(e.target.value))}
        />
      </div>

      <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
        Total players expected: <strong>{total}</strong>
      </p>

      {error && <div className="error">{error}</div>}

      <div className="button-row" style={{ marginTop: '0.75rem' }}>
        <button onClick={handleCreate} disabled={loading || total <= 0}>
          {loading ? 'Creating...' : 'Create & Enter'}
        </button>
        <button
          className="button-secondary"
          onClick={() => router.push('/')}
          disabled={loading}
        >
          Back
        </button>
      </div>
    </div>
  );
}
