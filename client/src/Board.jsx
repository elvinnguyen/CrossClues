export default function Board({ gameState, canVote, myVote, onVote, wrongCell }) {
  const { columnLabels, rowLabels, columnCategories, rowCategories, grid } = gameState;

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
                const isMyVote = myVote === cell;
                const isWrong = wrongCell === cell;
                const clickable = canVote && !revealed && !myVote;
                return (
                  <td
                    key={cell}
                    className={[
                      'cell',
                      revealed && 'revealed',
                      clickable && 'clickable',
                      isMyVote && 'voted',
                      isWrong && 'wrong-flash',
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      if (clickable) onVote(cell);
                    }}
                  >
                    {revealed ? (
                      <span className="cell-label">{cell}</span>
                    ) : (
                      <span className="cell-empty">{cell}</span>
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
