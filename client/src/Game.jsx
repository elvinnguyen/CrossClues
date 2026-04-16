import { useState } from 'react';
import socket from './socket.js';
import Board from './Board.jsx';
import ChatRoom from './ChatRoom.jsx';

export default function Game({
  roomId,
  playerName,
  gameState,
  guessResult,
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
  const myVote = gameState.myVote ?? null;
  const currentClue = gameState.currentClue
    || (gameState.usedClues.length > 0 ? gameState.usedClues[gameState.usedClues.length - 1] : null);

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

  function handleVote(cell) {
    socket.emit('submit_vote', { roomId, cell }, (res) => {
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

  const wrongCell = guessResult && !guessResult.correct ? guessResult.cell : null;

  return (
    <div className="game">
      <div className="game-header">
        <div className="game-info">
          <span className="room-code">Room: {roomId}</span>
          <span className="deck-info">Deck: {gameState.deckCount} | Discarded: {gameState.discardCount}</span>
          <span className="score">Revealed: {gameState.revealedCount}/25</span>
        </div>
        <div className="turn-info">
          {isEnded ? (
            <span className="ended-label">Game Over</span>
          ) : isGuessPhase ? (
            <span>
              {isMyTurn
                ? 'Waiting for votes...'
                : `Your turn to guess`}
            </span>
          ) : (
            <span>
              {isMyTurn
                ? 'Your turn — give a clue!'
                : <span>Waiting for <strong>{gameState.activePlayer}</strong>...</span>}
            </span>
          )}
        </div>
      </div>

      {notification && <div className="notification">{notification}</div>}

      {guessResult && (
        <div className={`guess-banner ${guessResult.correct ? 'correct' : 'wrong'}`}>
          {guessResult.correct
            ? `Correct! ${guessResult.cell} revealed!`
            : `Wrong guess: ${guessResult.cell}. The card was discarded.`}
        </div>
      )}

      {isEnded && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>
            Your team revealed <strong>{gameState.revealedCount}</strong> out of 25 cells.
          </p>
        </div>
      )}

      <div className="game-body">
        <div className="col-board">
          <Board
            gameState={gameState}
            canVote={isGuessPhase && !isMyTurn && !isEnded}
            myVote={myVote}
            onVote={handleVote}
            wrongCell={wrongCell}
          />
        </div>

        <div className="col-middle">
          {isCluePhase && isMyTurn && gameState.currentCard && (
            <div className="clue-section">
              <div className="your-card">
                Your card: <strong>{gameState.currentCard}</strong>
                <span className="card-hint">
                  ({gameState.columnCategories[gameState.columnLabels.indexOf(gameState.currentCard[0])]} +{' '}
                  {gameState.rowCategories[gameState.rowLabels.indexOf(gameState.currentCard[1])]})
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
                <strong>{gameState.activePlayer}</strong> says: <strong className="clue-word">"{currentClue}"</strong>
              </p>
              {!myVote ? (
                <p>Click a cell on the board to vote!</p>
              ) : (
                <p>
                  You voted: <strong>{myVote}</strong>. Waiting for others...
                </p>
              )}
              <div className="vote-progress">
                <span className="vote-count">{gameState.votedCount}/{gameState.voterCount} voted</span>
                <div className="vote-bar">
                  <div
                    className="vote-fill"
                    style={{ width: `${gameState.voterCount > 0 ? (gameState.votedCount / gameState.voterCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {isGuessPhase && isMyTurn && (
            <div className="waiting-section">
              <p>You gave the clue <strong className="clue-word">"{currentClue}"</strong>. Waiting for others to vote...</p>
              <div className="vote-progress">
                <span className="vote-count">{gameState.votedCount}/{gameState.voterCount} voted</span>
                <div className="vote-bar">
                  <div
                    className="vote-fill"
                    style={{ width: `${gameState.voterCount > 0 ? (gameState.votedCount / gameState.voterCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
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

        <div className="col-chat">
          <ChatRoom
            roomId={roomId}
            playerName={playerName}
            messages={gameState.chatMessages ?? []}
          />
        </div>
      </div>
    </div>
  );
}
