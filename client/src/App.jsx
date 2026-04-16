import { useState, useEffect, useRef } from 'react';
import socket from './socket.js';
import Lobby from './Lobby.jsx';
import Game from './Game.jsx';
import './styles.css';

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [notification, setNotification] = useState(null);
  const [guessResult, setGuessResult] = useState(null);

  const prevGuessRef = useRef(null);
  const guessTimerRef = useRef(null);

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGameState(state);

      const r = state.lastGuessResult;
      if (r && JSON.stringify(r) !== JSON.stringify(prevGuessRef.current)) {
        prevGuessRef.current = r;
        setGuessResult(r);
        clearTimeout(guessTimerRef.current);
        guessTimerRef.current = setTimeout(() => setGuessResult(null), 3000);
      }
    });

    socket.on('player_left', ({ name }) => {
      setNotification(`${name} left the game`);
      setTimeout(() => setNotification(null), 3000);
    });

    return () => {
      socket.off('game_state');
      socket.off('player_left');
      clearTimeout(guessTimerRef.current);
    };
  }, []);

  if (!roomId) {
    return (
      <Lobby
        onJoined={(id, name) => {
          setRoomId(id);
          setPlayerName(name);
        }}
      />
    );
  }

  return (
    <Game
      roomId={roomId}
      playerName={playerName}
      gameState={gameState}
      guessResult={guessResult}
      notification={notification}
    />
  );
}
