import { useState } from 'react';
import AirportAutocomplete from './AirportAutocomplete.jsx';

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function SearchForm({ initialValues, onSubmit, compact = false }) {
  const [from, setFrom] = useState(initialValues?.from ?? null);
  const [to, setTo] = useState(initialValues?.to ?? null);
  const [date, setDate] = useState(initialValues?.date ?? '');
  const [passengers, setPassengers] = useState(initialValues?.passengers ?? 1);
  const [travelClass, setTravelClass] = useState(initialValues?.travelClass ?? 'ECONOMY');
  const [error, setError] = useState('');

  function handleSwap() {
    setFrom(to);
    setTo(from);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!from || !to) {
      setError('Please select both origin and destination airports.');
      return;
    }
    if (from.code === to.code) {
      setError('Origin and destination cannot be the same.');
      return;
    }
    if (!date) {
      setError('Please select a departure date.');
      return;
    }
    if (date < todayIso()) {
      setError('Departure date cannot be in the past.');
      return;
    }

    setError('');
    onSubmit({ from, to, date, passengers, travelClass });
  }

  return (
    <form className={`search-form ${compact ? 'compact' : ''}`} onSubmit={handleSubmit} data-testid="search-form">
      <div className="search-form-row">
        <AirportAutocomplete
          id="from-airport"
          label="From"
          testId="from"
          value={from}
          onChange={setFrom}
          placeholder="Origin city or airport"
        />
        <button
          type="button"
          className="swap-button"
          onClick={handleSwap}
          data-testid="swap-button"
          aria-label="Swap origin and destination"
        >
          ⇄
        </button>
        <AirportAutocomplete
          id="to-airport"
          label="To"
          testId="to"
          value={to}
          onChange={setTo}
          placeholder="Destination city or airport"
        />
        <div className="field">
          <label htmlFor="depart-date">Departure date</label>
          <input
            id="depart-date"
            type="date"
            min={todayIso()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            data-testid="date-input"
          />
        </div>
        <div className="field">
          <label htmlFor="passengers">Passengers</label>
          <select
            id="passengers"
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            data-testid="passengers-select"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="travel-class">Class</label>
          <select
            id="travel-class"
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value)}
            data-testid="class-select"
          >
            <option value="ECONOMY">Economy</option>
            <option value="BUSINESS">Business</option>
          </select>
        </div>
        <button type="submit" className="search-submit-button" data-testid="search-submit-button">
          Search flights
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert" data-testid="search-form-error">
          {error}
        </p>
      )}
    </form>
  );
}
