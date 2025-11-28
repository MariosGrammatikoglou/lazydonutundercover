'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  const trimmed = username.trim();
  const disabled = trimmed.length === 0;

  const goCreate = () => {
    if (disabled) return;
    router.push(`/create?username=${encodeURIComponent(trimmed)}`);
  };

  const goJoin = () => {
    if (disabled) return;
    router.push(`/join?username=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="card">
      <h2>Lazy Donut Undercover</h2>
      <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#9ca3af' }}>
        Enter your username for this session (no account, no save).
      </p>

      <div className="form-group">
        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="lazy_donut123"
        />
      </div>

      <div className="button-row" style={{ marginTop: '0.75rem' }}>
        <button onClick={goCreate} disabled={disabled}>
          Create Lobby
        </button>
        <button
          onClick={goJoin}
          disabled={disabled}
          className="button-secondary"
        >
          Join Lobby
        </button>
      </div>
    </div>
  );
}
