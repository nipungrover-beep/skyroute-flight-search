function formatFee(fee) {
  return fee > 0 ? `+₹${fee}` : '';
}

export default function SeatMap({ columns, seats, selectedSeatId, onSelect }) {
  const seatsByRow = new Map();
  for (const seat of seats) {
    if (!seatsByRow.has(seat.row)) seatsByRow.set(seat.row, []);
    seatsByRow.get(seat.row).push(seat);
  }
  const rowNumbers = Array.from(seatsByRow.keys()).sort((a, b) => a - b);
  const aisleAfterIndex = columns.length / 2 - 1;

  return (
    <div className="seat-map" data-testid="seat-map">
      <div className="seat-map-legend">
        <span className="legend-item">
          <span className="seat-swatch available" /> Available
        </span>
        <span className="legend-item">
          <span className="seat-swatch selected" /> Selected
        </span>
        <span className="legend-item">
          <span className="seat-swatch unavailable" /> Unavailable
        </span>
        <span className="legend-item">
          <span className="seat-swatch extra-legroom" /> Extra legroom (+fee)
        </span>
      </div>
      <div className="seat-map-rows">
        {rowNumbers.map((rowNum) => (
          <div className="seat-row" key={rowNum}>
            <span className="row-number">{rowNum}</span>
            {seatsByRow.get(rowNum).flatMap((seat, index) => {
              const button = (
                <button
                  key={seat.id}
                  type="button"
                  className={[
                    'seat',
                    seat.type,
                    !seat.available ? 'unavailable' : '',
                    selectedSeatId === seat.id ? 'selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!seat.available}
                  onClick={() => onSelect(seat.id)}
                  data-testid={`seat-${seat.id}`}
                  aria-label={`Seat ${seat.id}${seat.fee ? `, ${formatFee(seat.fee)}` : ''}${
                    !seat.available ? ', unavailable' : ''
                  }`}
                >
                  {seat.col}
                  {seat.fee > 0 && <span className="seat-fee">{formatFee(seat.fee)}</span>}
                </button>
              );
              return index === aisleAfterIndex ? [button, <span key={`${seat.id}-aisle`} className="aisle-gap" />] : [button];
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
