import { useState } from 'react';
import socket from './socket.js';
import Board from './Board.jsx';

export default function Game({
  roomId,
  playerName,
  gameState,
  myCard,
  lastClue,
  lastGuessResult,
  gameEnd,
  notification,
}) {
  const [clueInput, setClueInput] = useState('');
  const [error, setError] = useState('');

  if (!gameState) return <div className="loading">Connecting...</div>;

  const isLobby = gameState.phase === 'lobby';
  const isMyTurn = gameState.activePlayer === playerName;
  const isCluePhase = gameState.phase === 'clue';
  const isGuessPhase = gameState.phase === 'guess';
  const isEnded = gameState.phase === 'ended';

  function handleStartGame() {
    socket.emit('start_game', { roomId }, (res) => {
      if (!res.ok) setError(res.reason);
    });
  }

  function handleSubmitClue() {
    if (!clueInput.trim()) return;
    socket.emit('submit_clue', { roomId, clue: clueInput.trim() }, (res) => {
      if (res.ok) {
        setClueInput('');
        setError('');
      } else {
        setError(res.reason);
      }
    });
  }

  function handleGuess(cell) {
    socket.emit('make_guess', { roomId, cell }, (res) => {
      if (!res.ok) setError(res.reason);
      else setError('');
    });
  }

  if (isLobby) {
    return (
      <div className="game-lobby">
        <h2>Room: {roomId}</h2>
        <p className="share-hint">Share this code with friends to join</p>
        <div className="player-list">
          <h3>Players ({gameState.players.length}/4)</h3>
          {gameState.players.map((p) => (
            <div key={p} className={`player-tag ${p === playerName ? 'me' : ''}`}>
              {p} {p === playerName && '(you)'}
            </div>
          ))}
        </div>
        {gameState.players.length >= 2 && (
          <button className="primary" onClick={handleStartGame}>
            Start Game
          </button>
        )}
        {gameState.players.length < 2 && (
          <p className="waiting">Waiting for more players...</p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="game">
      <div className="game-header">
        <div className="game-info">
          <span className="room-code">Room: {roomId}</span>
          <span className="deck-info">Deck: {gameState.deckCount} | Discarded: {gameState.discardCount}</span>
          <span className="score">Revealed: {gameState.revealedCount}/25</span>
        </div>
        <div className="turn-info">
          {isEnded || gameEnd ? (
            <span className="ended-label">Game Over</span>
          ) : (
            <span>
              Turn: <strong>{gameState.activePlayer}</strong>
              {isMyTurn && ' (you)'}
            </span>
          )}
        </div>
      </div>

      {notification && <div className="notification">{notification}</div>}

      {lastGuessResult && (
        <div className={`guess-banner ${lastGuessResult.correct ? 'correct' : 'wrong'}`}>
          {lastGuessResult.correct
            ? `Correct! ${lastGuessResult.cell} revealed!`
            : `Wrong! The card was ${lastGuessResult.actualCard}, guessed ${lastGuessResult.cell}`}
        </div>
      )}

      {(isEnded || gameEnd) && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>
            Your team revealed <strong>{gameEnd?.revealedCount ?? gameState.revealedCount}</strong> out of 25 cells.
          </p>
        </div>
      )}

      <Board
        gameState={gameState}
        canGuess={isGuessPhase && !isMyTurn && !isEnded}
        onGuess={handleGuess}
      />

      <div className="sidebar">
        {isCluePhase && isMyTurn && myCard && (
          <div className="clue-section">
            <div className="your-card">
              Your card: <strong>{myCard}</strong>
              <span className="card-hint">
                ({gameState.columnCategories[gameState.columnLabels.indexOf(myCard[0])]} +{' '}
                {gameState.rowCategories[gameState.rowLabels.indexOf(myCard[1])]})
              </span>
            </div>
            <div className="clue-input-row">
              <input
                type="text"
                placeholder="Enter one-word clue..."
                value={clueInput}
                onChange={(e) => setClueInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
              />
              <button className="primary" onClick={handleSubmitClue}>
                Submit
              </button>
            </div>
          </div>
        )}

        {isCluePhase && !isMyTurn && (
          <div className="waiting-section">
            Waiting for <strong>{gameState.activePlayer}</strong> to give a clue...
          </div>
        )}

        {isGuessPhase && !isMyTurn && (
          <div className="guess-section">
            <p>
              Clue: <strong className="clue-word">"{lastClue?.clue}"</strong> by {lastClue?.by}
            </p>
            <p>Click a cell on the board to guess!</p>
          </div>
        )}

        {isGuessPhase && isMyTurn && (
          <div className="waiting-section">
            You gave the clue. Waiting for others to guess...
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="used-clues">
          <h3>Used Clues</h3>
          {gameState.usedClues.length === 0 ? (
            <p className="muted">None yet</p>
          ) : (
            <div className="clue-list">
              {gameState.usedClues.map((c, i) => (
                <span key={i} className="clue-tag">{c}</span>
              ))}
            </div>
          )}
        </div>

        <div className="players-sidebar">
          <h3>Players</h3>
          {gameState.players.map((p, i) => (
            <div
              key={p}
              className={`player-row ${i === gameState.turnIndex && !isEnded ? 'active' : ''} ${p === playerName ? 'me' : ''}`}
            >
              {i === gameState.turnIndex && !isEnded && <span className="turn-dot" />}
              {p} {p === playerName && '(you)'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
