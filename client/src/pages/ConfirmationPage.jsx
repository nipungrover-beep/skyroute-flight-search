import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { confirmSelection, getSeatMap } from '../api/client.js';

function formatPrice(price) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function classLabel(travelClass) {
  return travelClass === 'BUSINESS' ? 'Business' : 'Economy';
}

export default function ConfirmationPage() {
  const { flightId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [feeSeatNotice, setFeeSeatNotice] = useState(false);

  // Only the initial load reacts to the URL. A class switch is handled entirely by
  // handleClassSwitch below, which updates `confirmation` in place — re-running this
  // effect on every searchParams change would flip status back to 'loading' and hide
  // the whole card during what should be a quick, in-place update.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId]);

  async function handleClassSwitch(newClass) {
    if (!confirmation || switching || newClass === confirmation.travelClass) return;

    setSwitching(true);
    setSwitchError('');
    try {
      const seatMap = await getSeatMap(flightId, newClass);
      const standardSeat = seatMap.seats.find((s) => s.available && s.type === 'standard');
      const preferredSeat = standardSeat ?? seatMap.seats.find((s) => s.available);
      if (!preferredSeat) {
        throw new Error(`No seats available in ${classLabel(newClass)} class.`);
      }

      const data = await confirmSelection(flightId, {
        travelClass: newClass,
        passengers: criteria.passengers,
        fareId: criteria.fareId,
        seatId: preferredSeat.id,
      });

      setConfirmation(data);
      setFeeSeatNotice(!standardSeat && preferredSeat.fee > 0);
      const params = new URLSearchParams(searchParams);
      params.set('travelClass', newClass);
      params.set('seatId', preferredSeat.id);
      setSearchParams(params, { replace: true });
    } catch (err) {
      setSwitchError(err.message);
    } finally {
      setSwitching(false);
    }
  }

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
              <dd>
                <div className="class-toggle" role="group" aria-label="Travel class" data-testid="class-toggle">
                  <button
                    type="button"
                    className={`class-toggle-option ${confirmation.travelClass === 'ECONOMY' ? 'active' : ''}`}
                    onClick={() => handleClassSwitch('ECONOMY')}
                    disabled={switching || confirmation.travelClass === 'ECONOMY'}
                    data-testid="class-toggle-economy"
                  >
                    Economy
                  </button>
                  <button
                    type="button"
                    className={`class-toggle-option ${confirmation.travelClass === 'BUSINESS' ? 'active' : ''}`}
                    onClick={() => handleClassSwitch('BUSINESS')}
                    disabled={switching || confirmation.travelClass === 'BUSINESS'}
                    data-testid="class-toggle-business"
                  >
                    Business
                  </button>
                </div>
                {switching && (
                  <span className="class-switch-status" data-testid="class-switch-loading">
                    Updating…
                  </span>
                )}
                {switchError && (
                  <span className="class-switch-status error" role="alert" data-testid="class-switch-error">
                    {switchError}
                  </span>
                )}
                {!switching && feeSeatNotice && (
                  <span className="class-switch-status" data-testid="class-switch-fee-notice">
                    No standard seat was free in {classLabel(confirmation.travelClass)} — an extra-legroom seat
                    (+fee) was selected instead.
                  </span>
                )}
              </dd>
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
