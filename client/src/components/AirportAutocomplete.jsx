import { useEffect, useRef, useState } from 'react';
import { searchAirports } from '../api/client.js';

export default function AirportAutocomplete({ id, label, testId, value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState(value ? formatAirport(value) : '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const latestQueryRef = useRef(0);

  useEffect(() => {
    setInputValue(value ? formatAirport(value) : '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleInputChange(event) {
    const text = event.target.value;
    setInputValue(text);
    onChange(null);
    setHighlightedIndex(-1);

    if (text.trim().length === 0) {
      latestQueryRef.current += 1;
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const queryId = ++latestQueryRef.current;
    const results = await searchAirports(text.trim());
    if (queryId !== latestQueryRef.current) return;
    setSuggestions(results);
    setIsOpen(true);
  }

  function selectAirport(airport) {
    onChange(airport);
    setInputValue(formatAirport(airport));
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(event) {
    if (!isOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      if (highlightedIndex >= 0) {
        event.preventDefault();
        selectAirport(suggestions[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="autocomplete" ref={containerRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        data-testid={`${testId}-input`}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="autocomplete-list" data-testid={`${testId}-suggestions`} role="listbox">
          {suggestions.map((airport, index) => (
            <li
              key={airport.code}
              role="option"
              aria-selected={index === highlightedIndex}
              className={index === highlightedIndex ? 'highlighted' : ''}
              data-testid={`${testId}-option-${airport.code}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectAirport(airport);
              }}
            >
              <span className="airport-code">{airport.code}</span>
              <span className="airport-city">{airport.city}</span>
              <span className="airport-name">{airport.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatAirport(airport) {
  return `${airport.city} (${airport.code})`;
}
