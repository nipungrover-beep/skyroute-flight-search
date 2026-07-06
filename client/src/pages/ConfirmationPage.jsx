import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { confirmSelection } from '../api/client.js';

function formatPrice(price) {
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function ConfirmationPage() {
  const { flightId } = useParams();
  const [searchParams] = useSearchParams();

  const criteria = useMemo(
    () => ({
      travelClass: searchParams.get('travelClass') || 'ECONOMY',
      passengers: Number(searchParams.get('passengers') || 1),
      fareId: searchParams.get('fareId'),
      seatId: searchParams.get('seatId'),
      date: searchParams.get('date'),
    }),
    [searchParams]
  );

  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    if (!criteria.fareId || !criteria.seatId) {
      setStatus('error');
      setErrorMessage('Missing fare or seat selection.');
      return;
    }

    setStatus('loading');
    confirmSelection(flightId, criteria)
      .then((data) => {
        setConfirmation(data);
        setStatus('success');
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  }, [flightId, criteria.travelClass, criteria.passengers, criteria.fareId, criteria.seatId]);

  return (
    <div className="confirmation-page">
      <h1>Selection summary</h1>

      {status === 'loading' && (
        <p className="loading-spinner" data-testid="loading-spinner">
          Confirming your selection…
        </p>
      )}

      {status === 'error' && (
        <p className="error-message" role="alert" data-testid="error-message">
          {errorMessage}
        </p>
      )}

      {status === 'success' && confirmation && (
        <div className="confirmation-card" data-testid="confirmation-card">
          <p className="confirmation-route">
            {confirmation.airline} {confirmation.flightNumber} &middot; {confirmation.from.city} (
            {confirmation.from.code}) → {confirmation.to.city} ({confirmation.to.code})
            {criteria.date && <> &middot; {criteria.date}</>}
          </p>

          <dl className="confirmation-details">
            <div>
              <dt>Fare</dt>
              <dd data-testid="confirmation-fare">{confirmation.fare.name}</dd>
            </div>
            <div>
              <dt>Seat</dt>
              <dd data-testid="confirmation-seat">{confirmation.seat.id}</dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd>{confirmation.passengers}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{confirmation.travelClass}</dd>
            </div>
          </dl>

          <div className="confirmation-total">
            <span>Total price</span>
            <span className="confirmation-total-price" data-testid="confirmation-total-price">
              {formatPrice(confirmation.totalPrice)}
            </span>
          </div>

          <p className="confirmation-id" data-testid="confirmation-id">
            Reference: <code>{confirmation.selectionId}</code>
          </p>

          <Link className="search-again-link" to="/" data-testid="search-again-link">
            Search another flight
          </Link>
        </div>
      )}
    </div>
  );
}
