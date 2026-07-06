const ECONOMY_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F']; // aisle between C and D
const BUSINESS_COLUMNS = ['A', 'C', 'D', 'F']; // 2-2 layout, aisle between C and D
const EXTRA_LEGROOM_ROWS = 2; // first N rows of the cabin
const EXTRA_LEGROOM_FEE = { ECONOMY: 300, BUSINESS: 500 };

function deterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function generateSeatMap(flightId, travelClass, capacity) {
  const columns = travelClass === 'BUSINESS' ? BUSINESS_COLUMNS : ECONOMY_COLUMNS;
  const extraLegroomFee = EXTRA_LEGROOM_FEE[travelClass] ?? EXTRA_LEGROOM_FEE.ECONOMY;
  const rows = Math.ceil(capacity / columns.length);

  const seats = [];
  let seatCount = 0;
  for (let row = 1; row <= rows && seatCount < capacity; row += 1) {
    for (const col of columns) {
      if (seatCount >= capacity) break;
      const id = `${row}${col}`;
      const type = row <= EXTRA_LEGROOM_ROWS ? 'extra-legroom' : 'standard';
      const fee = type === 'extra-legroom' ? extraLegroomFee : 0;
      // ~20% of seats are pre-occupied, deterministic per flight+seat so it never changes between requests.
      const occupied = deterministicHash(`${flightId}-${travelClass}-${id}`) % 5 === 0;
      seats.push({ id, row, col, type, fee, available: !occupied });
      seatCount += 1;
    }
  }

  return { columns, rows, seats };
}
