import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FareCard from '../components/FareCard.jsx';
import SeatMap from '../components/SeatMap.jsx';
import { getFares, getSeatMap } from '../api/client.js';

function formatPrice(price) {
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function SelectionPage() {
  const { flightId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const criteria = useMemo(
    () => ({
      travelClass: searchParams.get('travelClass') || 'ECONOMY',
      passengers: Number(searchParams.get('passengers') || 1),
      from: searchParams.get('from'),
      fromCity: searchParams.get('fromCity'),
      to: searchParams.get('to'),
      toCity: searchParams.get('toCity'),
      date: searchParams.get('date'),
      flightNumber: searchParams.get('flightNumber'),
      airline: searchParams.get('airline'),
      departTime: searchParams.get('departTime'),
      arriveTime: searchParams.get('arriveTime'),
    }),
    [searchParams]
  );

  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [fares, setFares] = useState([]);
  const [seatMap, setSeatMap] = useState(null);
  const [fareId, setFareId] = useState(null);
  const [seatId, setSeatId] = useState(null);

  useEffect(() => {
    setStatus('loading');
    setFareId(null);
    setSeatId(null);
    Promise.all([getFares(flightId, criteria.travelClass), getSeatMap(flightId, criteria.travelClass)])
      .then(([faresData, seatMapData]) => {
        setFares(faresData.fares);
        setSeatMap(seatMapData);
        setStatus('success');
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  }, [flightId, criteria.travelClass]);

  function handleContinue() {
    const params = new URLSearchParams({
      travelClass: criteria.travelClass,
      passengers: String(criteria.passengers),
      fareId,
      seatId,
      from: criteria.from,
      fromCity: criteria.fromCity,
      to: criteria.to,
      toCity: criteria.toCity,
      date: criteria.date,
    });
    navigate(`/flights/${flightId}/confirm?${params.toString()}`);
  }

  const selectedFare = fares.find((f) => f.id === fareId);
  const selectedSeat = seatMap?.seats.find((s) => s.id === seatId);
  const canContinue = Boolean(fareId && seatId);

  return (
    <div className="selection-page">
      <div className="selection-header">
        <h1>Choose your fare and seat</h1>
        {criteria.flightNumber && (
          <p className="selection-subtitle">
            {criteria.airline} {criteria.flightNumber} &middot; {criteria.fromCity} ({criteria.from}) {criteria.departTime}{' '}
            → {criteria.toCity} ({criteria.to}) {criteria.arriveTime} &middot; {criteria.date}
          </p>
        )}
      </div>

      {status === 'loading' && (
        <p className="loading-spinner" data-testid="loading-spinner">
          Loading fares and seats…
        </p>
      )}

      {status === 'error' && (
        <p className="error-message" role="alert" data-testid="error-message">
          {errorMessage}
        </p>
      )}

      {status === 'success' && (
        <div className="selection-layout">
          <section className="selection-section">
            <h2>1. Choose your fare</h2>
            <div className="fare-list" data-testid="fare-list">
              {fares.map((fare) => (
                <FareCard key={fare.id} fare={fare} selected={fareId === fare.id} onSelect={setFareId} />
              ))}
            </div>
          </section>

          <section className="selection-section">
            <h2>2. Choose your seat</h2>
            <SeatMap
              columns={seatMap.columns}
              seats={seatMap.seats}
              selectedSeatId={seatId}
              onSelect={setSeatId}
            />
          </section>

          <div className="selection-summary-bar">
            <div className="selection-summary-text" data-testid="selection-summary">
              {selectedFare && <span>{selectedFare.name}</span>}
              {selectedSeat && <span>Seat {selectedSeat.id}</span>}
              {selectedFare && (
                <span className="selection-summary-price">
                  {formatPrice(selectedFare.price * criteria.passengers + (selectedSeat?.fee ?? 0))}
                </span>
              )}
            </div>
            <button
              type="button"
              className="continue-button"
              disabled={!canContinue}
              onClick={handleContinue}
              data-testid="continue-button"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
