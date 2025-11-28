'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  const disabled = !username.trim();

  const handleCreate = () => {
    if (!disabled) {
      router.push(`/create?username=${encodeURIComponent(username.trim())}`);
    }
  };

  const handleJoin = () => {
    if (!disabled) {
      router.push(`/join?username=${encodeURIComponent(username.trim())}`);
    }
  };

  return (
    <div className="card">
      <h2>Welcome 👋</h2>
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

      <div className="button-row">
        <button onClick={handleCreate} disabled={disabled}>
          Create Lobby
        </button>
        <button
          onClick={handleJoin}
          disabled={disabled}
          className="button-secondary"
        >
          Join Lobby
        </button>
      </div>
    </div>
  );
}
