function formatPrice(price) {
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function FareCard({ fare, selected, onSelect }) {
  return (
    <label className={`fare-card ${selected ? 'selected' : ''}`} data-testid={`fare-option-${fare.id}`}>
      <input
        type="radio"
        name="fare"
        value={fare.id}
        checked={selected}
        onChange={() => onSelect(fare.id)}
        data-testid={`fare-radio-${fare.id}`}
      />
      <div className="fare-card-body">
        <div className="fare-card-head">
          <span className="fare-name">{fare.name}</span>
          <span className="fare-price">{formatPrice(fare.price)}</span>
        </div>
        <ul className="fare-perks">
          <li>{fare.baggageKg}kg baggage</li>
          <li>{fare.meal ? 'Meal included' : 'No meal'}</li>
          <li>{fare.freeDateChange ? 'Free date change' : 'Date change fee applies'}</li>
          <li>{fare.freeCancellation ? 'Free cancellation' : 'Cancellation fee applies'}</li>
          <li>{fare.freeSeatSelection ? 'Free seat selection' : 'Standard seat selection'}</li>
        </ul>
      </div>
    </label>
  );
}
