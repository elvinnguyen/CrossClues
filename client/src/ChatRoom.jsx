import { useState, useRef, useEffect } from 'react';
import socket from './socket.js';

export default function ChatRoom({ roomId, playerName, messages }) {
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevLenRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    socket.emit('send_chat_message', { roomId, message: text });
    setInput('');
  }

  return (
    <div className="chat-room">
      <h3 className="chat-title">Chat</h3>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-empty">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.sender === playerName ? 'mine' : ''}`}
          >
            <span className="chat-sender">{msg.sender}</span>
            <span className="chat-text">{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          maxLength={300}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
