function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatPrice(price) {
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function FlightCard({ flight }) {
  const stopsLabel = flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`;

  return (
    <article className="flight-card" data-testid="flight-card" data-flight-id={flight.id}>
      <div className="flight-card-airline">
        <span className="airline-name" data-testid="flight-airline">
          {flight.airline}
        </span>
        <span className="flight-number" data-testid="flight-number">
          {flight.flightNumber}
        </span>
      </div>

      <div className="flight-card-route">
        <div className="leg">
          <span className="time" data-testid="flight-depart-time">
            {flight.departTime}
          </span>
          <span className="airport-code">{flight.from.code}</span>
        </div>
        <div className="leg-arrow">
          <span className="duration" data-testid="flight-duration">
            {formatDuration(flight.durationMinutes)}
          </span>
          <span className="stops" data-testid="flight-stops">
            {stopsLabel}
          </span>
        </div>
        <div className="leg">
          <span className="time" data-testid="flight-arrive-time">
            {flight.arriveTime}
          </span>
          <span className="airport-code">{flight.to.code}</span>
        </div>
      </div>

      <div className="flight-card-fare">
        <span className="price" data-testid="flight-price">
          {formatPrice(flight.price)}
        </span>
        <span className="seats-left" data-testid="flight-seats-available">
          {flight.seatsAvailable} seats left
        </span>
      </div>
    </article>
  );
}
