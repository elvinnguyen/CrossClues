export default function Board({
  gameState,
  canVote,
  myVote,
  mySelection,
  onSelect,
  onVote,
  wrongCell,
}) {
  const { columnLabels, rowLabels, columnCategories, rowCategories, grid } = gameState;
  const selections = gameState.selections ?? {};
  const playerVotes = gameState.playerVotes ?? [];

  const selectionsByCell = {};
  for (const [, { name, cell }] of Object.entries(selections)) {
    if (!selectionsByCell[cell]) selectionsByCell[cell] = [];
    selectionsByCell[cell].push(name);
  }

  const votesByCell = {};
  for (const { name, cell } of playerVotes) {
    if (!votesByCell[cell]) votesByCell[cell] = [];
    votesByCell[cell].push(name);
  }

  function handleCellClick(cell) {
    if (!canVote || grid[cell]?.revealed || myVote) return;
    if (mySelection === cell) {
      onVote(cell);
    } else {
      onSelect(cell);
    }
  }

  return (
    <div className="board-wrapper">
      <table className="board">
        <thead>
          <tr>
            <th className="corner" />
            {columnLabels.map((col, i) => (
              <th key={col} className="col-header">
                <span className="label">{col}</span>
                <span className="category">{columnCategories[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((row, ri) => (
            <tr key={row}>
              <th className="row-header">
                <span className="label">{row}</span>
                <span className="category">{rowCategories[ri]}</span>
              </th>
              {columnLabels.map((col) => {
                const cell = col + row;
                const revealed = grid[cell]?.revealed;
                const isMySelection = mySelection === cell;
                const isMyVote = myVote === cell;
                const isWrong = wrongCell === cell;
                const clickable = canVote && !revealed && !myVote;
                const othersSelecting = selectionsByCell[cell] || [];
                const othersVoted = votesByCell[cell] || [];
                const hasIndicators = othersSelecting.length > 0 || othersVoted.length > 0;

                return (
                  <td
                    key={cell}
                    className={[
                      'cell',
                      revealed && 'revealed',
                      clickable && 'clickable',
                      isMySelection && 'selected',
                      isMyVote && 'voted',
                      isWrong && 'wrong-flash',
                      othersSelecting.length > 0 && 'other-selecting',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleCellClick(cell)}
                  >
                    {revealed ? (
                      <span className="cell-label">{cell}</span>
                    ) : (
                      <span className="cell-empty">{cell}</span>
                    )}
                    {hasIndicators && !revealed && (
                      <div className="cell-indicators">
                        {othersSelecting.map((name) => (
                          <span key={`s-${name}`} className="indicator selecting">
                            {name.charAt(0)}
                          </span>
                        ))}
                        {othersVoted.map((name) => (
                          <span key={`v-${name}`} className="indicator voted-indicator">
                            {name.charAt(0)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
