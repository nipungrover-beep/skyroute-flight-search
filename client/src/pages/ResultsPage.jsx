import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchForm from '../components/SearchForm.jsx';
import FiltersPanel from '../components/FiltersPanel.jsx';
import SortBar from '../components/SortBar.jsx';
import FlightCard from '../components/FlightCard.jsx';
import { searchFlights } from '../api/client.js';

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function inDepartureWindow(departTime, window) {
  if (window === 'any') return true;
  const minutes = timeToMinutes(departTime);
  if (window === 'early-morning') return minutes < 360;
  if (window === 'morning') return minutes >= 360 && minutes < 720;
  if (window === 'afternoon') return minutes >= 720 && minutes < 1080;
  if (window === 'evening') return minutes >= 1080;
  return true;
}

export default function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const criteria = useMemo(
    () => ({
      from: searchParams.get('from'),
      fromCity: searchParams.get('fromCity'),
      to: searchParams.get('to'),
      toCity: searchParams.get('toCity'),
      date: searchParams.get('date'),
      passengers: Number(searchParams.get('passengers') || 1),
      travelClass: searchParams.get('travelClass') || 'ECONOMY',
    }),
    [searchParams]
  );

  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [flights, setFlights] = useState([]);

  const [stops, setStops] = useState('any');
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [departureWindow, setDepartureWindow] = useState('any');
  const [priceMax, setPriceMax] = useState(null);
  const [sort, setSort] = useState('price');

  useEffect(() => {
    if (!criteria.from || !criteria.to || !criteria.date) {
      setStatus('error');
      setErrorMessage('Missing search criteria.');
      return;
    }

    setStatus('loading');
    searchFlights({
      from: criteria.from,
      to: criteria.to,
      date: criteria.date,
      passengers: criteria.passengers,
      travelClass: criteria.travelClass,
    })
      .then((data) => {
        setFlights(data.flights);
        setStops('any');
        setSelectedAirlines([]);
        setDepartureWindow('any');
        setPriceMax(null);
        setSort('price');
        setStatus('success');
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  }, [criteria.from, criteria.to, criteria.date, criteria.passengers, criteria.travelClass]);

  const airlineCounts = useMemo(() => {
    const counts = new Map();
    for (const flight of flights) {
      counts.set(flight.airline, (counts.get(flight.airline) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [flights]);

  const priceBounds = useMemo(() => {
    if (flights.length === 0) return { min: 0, max: 0 };
    const prices = flights.map((f) => f.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [flights]);

  const effectivePriceMax = priceMax ?? priceBounds.max;

  const displayedFlights = useMemo(() => {
    let result = flights;

    if (stops === 'nonstop') result = result.filter((f) => f.stops === 0);
    if (stops === '1stop') result = result.filter((f) => f.stops >= 1);

    if (selectedAirlines.length > 0) {
      result = result.filter((f) => selectedAirlines.includes(f.airline));
    }

    if (departureWindow !== 'any') {
      result = result.filter((f) => inDepartureWindow(f.departTime, departureWindow));
    }

    if (priceMax !== null) {
      result = result.filter((f) => f.price <= priceMax);
    }

    result = [...result].sort((a, b) => {
      if (sort === 'duration') return a.durationMinutes - b.durationMinutes;
      if (sort === 'departure') return timeToMinutes(a.departTime) - timeToMinutes(b.departTime);
      return a.price - b.price;
    });

    return result;
  }, [flights, stops, selectedAirlines, departureWindow, priceMax, sort]);

  function toggleAirline(name) {
    setSelectedAirlines((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function handleNewSearch({ from, to, date, passengers, travelClass }) {
    const params = new URLSearchParams({
      from: from.code,
      fromCity: from.city,
      to: to.code,
      toCity: to.city,
      date,
      passengers: String(passengers),
      travelClass,
    });
    setSearchParams(params);
  }

  return (
    <div className="results-page">
      <SearchForm
        key={`${criteria.from}-${criteria.to}-${criteria.date}-${criteria.passengers}-${criteria.travelClass}`}
        compact
        initialValues={
          criteria.from && criteria.to
            ? {
                from: { code: criteria.from, city: criteria.fromCity },
                to: { code: criteria.to, city: criteria.toCity },
                date: criteria.date,
                passengers: criteria.passengers,
                travelClass: criteria.travelClass,
              }
            : undefined
        }
        onSubmit={handleNewSearch}
      />

      {status === 'loading' && (
        <p className="loading-spinner" data-testid="loading-spinner">
          Searching flights…
        </p>
      )}

      {status === 'error' && (
        <p className="error-message" role="alert" data-testid="error-message">
          {errorMessage}
        </p>
      )}

      {status === 'success' && (
        <div className="results-layout">
          <FiltersPanel
            airlines={airlineCounts}
            selectedAirlines={selectedAirlines}
            onToggleAirline={toggleAirline}
            stops={stops}
            onStopsChange={setStops}
            departureWindow={departureWindow}
            onDepartureChange={setDepartureWindow}
            priceBounds={priceBounds}
            priceMax={effectivePriceMax}
            onPriceMaxChange={setPriceMax}
          />

          <div className="results-main">
            <SortBar sort={sort} onSortChange={setSort} resultCount={displayedFlights.length} />

            {displayedFlights.length === 0 && (
              <p className="no-results-message" data-testid="no-results-message">
                No flights found for {criteria.fromCity} → {criteria.toCity} on {criteria.date}.
                Try different filters or dates.
              </p>
            )}

            <div className="flight-list" data-testid="results-list">
              {displayedFlights.map((flight) => (
                <FlightCard key={flight.id} flight={flight} passengers={criteria.passengers} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
