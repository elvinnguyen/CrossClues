import { useState } from 'react';
import socket from './socket.js';

export default function Lobby({ onJoined }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // null | 'create' | 'join'

  function handleCreate() {
    if (!name.trim()) return setError('Enter your name');
    socket.emit('create_room', { playerName: name.trim() }, (res) => {
      if (res.ok) {
        onJoined(res.roomId, name.trim());
      } else {
        setError(res.reason);
      }
    });
  }

  function handleJoin() {
    if (!name.trim()) return setError('Enter your name');
    if (!code.trim()) return setError('Enter a room code');
    socket.emit('join_room', { roomId: code.trim(), playerName: name.trim() }, (res) => {
      if (res.ok) {
        onJoined(res.roomId, name.trim());
      } else {
        setError(res.reason);
      }
    });
  }

  return (
    <div className="lobby">
      <h1>Cross Clues</h1>
      <p className="subtitle">A cooperative word-association board game</p>

      <div className="lobby-card">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
        />

        {!mode && (
          <div className="lobby-buttons">
            <button onClick={() => setMode('create')}>Create Room</button>
            <button onClick={() => setMode('join')}>Join Room</button>
          </div>
        )}

        {mode === 'create' && (
          <div className="lobby-buttons">
            <button className="primary" onClick={handleCreate}>
              Create
            </button>
            <button onClick={() => setMode(null)}>Back</button>
          </div>
        )}

        {mode === 'join' && (
          <div className="lobby-section">
            <input
              type="text"
              placeholder="Room code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
            />
            <div className="lobby-buttons">
              <button className="primary" onClick={handleJoin}>
                Join
              </button>
              <button onClick={() => setMode(null)}>Back</button>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
