const DEPARTURE_WINDOWS = [
  { value: 'any', label: 'Any time' },
  { value: 'early-morning', label: 'Before 6 AM' },
  { value: 'morning', label: '6 AM – 12 PM' },
  { value: 'afternoon', label: '12 PM – 6 PM' },
  { value: 'evening', label: 'After 6 PM' },
];

export default function FiltersPanel({
  airlines,
  selectedAirlines,
  onToggleAirline,
  stops,
  onStopsChange,
  departureWindow,
  onDepartureChange,
  priceBounds,
  priceMax,
  onPriceMaxChange,
}) {
  return (
    <aside className="filters-panel" data-testid="filters-panel">
      <h2>Filters</h2>

      <fieldset data-testid="filter-stops">
        <legend>Stops</legend>
        {[
          { value: 'any', label: 'Any' },
          { value: 'nonstop', label: 'Nonstop' },
          { value: '1stop', label: '1 stop or more' },
        ].map((option) => (
          <label key={option.value} className="radio-option">
            <input
              type="radio"
              name="stops"
              value={option.value}
              checked={stops === option.value}
              onChange={() => onStopsChange(option.value)}
              data-testid={`filter-stops-${option.value}`}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset data-testid="filter-airlines">
        <legend>Airlines</legend>
        {airlines.length === 0 && <p className="filter-empty">No airlines to filter</p>}
        {airlines.map(({ name, count }) => (
          <label key={name} className="checkbox-option">
            <input
              type="checkbox"
              checked={selectedAirlines.includes(name)}
              onChange={() => onToggleAirline(name)}
              data-testid={`filter-airline-${name.replace(/\s+/g, '-')}`}
            />
            {name} ({count})
          </label>
        ))}
      </fieldset>

      <fieldset data-testid="filter-departure">
        <legend>Departure time</legend>
        {DEPARTURE_WINDOWS.map((option) => (
          <label key={option.value} className="radio-option">
            <input
              type="radio"
              name="departure"
              value={option.value}
              checked={departureWindow === option.value}
              onChange={() => onDepartureChange(option.value)}
              data-testid={`filter-departure-${option.value}`}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset data-testid="filter-price">
        <legend>
          Max price: ₹{priceMax.toLocaleString('en-IN')}
        </legend>
        <input
          type="range"
          min={priceBounds.min}
          max={priceBounds.max}
          value={priceMax}
          onChange={(e) => onPriceMaxChange(Number(e.target.value))}
          data-testid="filter-price-max"
        />
      </fieldset>
    </aside>
  );
}
