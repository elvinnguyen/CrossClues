import { useState, useEffect } from 'react';
import socket from './socket.js';
import Lobby from './Lobby.jsx';
import Game from './Game.jsx';
import './styles.css';

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [myCard, setMyCard] = useState(null);
  const [lastClue, setLastClue] = useState(null);
  const [lastGuessResult, setLastGuessResult] = useState(null);
  const [gameEnd, setGameEnd] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('your_card', ({ card }) => {
      setMyCard(card);
    });

    socket.on('clue_given', ({ clue, by }) => {
      setLastClue({ clue, by });
      setMyCard(null);
    });

    socket.on('guess_result', (result) => {
      setLastGuessResult(result);
      setTimeout(() => setLastGuessResult(null), 3000);
    });

    socket.on('game_end', (data) => {
      setGameEnd(data);
    });

    socket.on('player_left', ({ name }) => {
      setNotification(`${name} left the game`);
      setTimeout(() => setNotification(null), 3000);
    });

    return () => {
      socket.off('game_state');
      socket.off('your_card');
      socket.off('clue_given');
      socket.off('guess_result');
      socket.off('game_end');
      socket.off('player_left');
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
      myCard={myCard}
      lastClue={lastClue}
      lastGuessResult={lastGuessResult}
      gameEnd={gameEnd}
      notification={notification}
    />
  );
}
