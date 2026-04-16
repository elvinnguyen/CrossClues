export default function Board({ gameState, canGuess, onGuess }) {
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
                return (
                  <td
                    key={cell}
                    className={`cell ${revealed ? 'revealed' : ''} ${canGuess && !revealed ? 'clickable' : ''}`}
                    onClick={() => {
                      if (canGuess && !revealed) onGuess(cell);
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
