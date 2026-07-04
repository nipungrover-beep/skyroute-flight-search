const SORT_OPTIONS = [
  { value: 'price', label: 'Price (low to high)' },
  { value: 'duration', label: 'Duration (shortest)' },
  { value: 'departure', label: 'Departure time (earliest)' },
];

export default function SortBar({ sort, onSortChange, resultCount }) {
  return (
    <div className="sort-bar">
      <span className="results-count" data-testid="results-count">
        {resultCount} flight{resultCount === 1 ? '' : 's'} found
      </span>
      <label htmlFor="sort-select">
        Sort by{' '}
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          data-testid="sort-select"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
