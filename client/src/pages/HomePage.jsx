import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm.jsx';

export default function HomePage() {
  const navigate = useNavigate();

  function handleSubmit({ from, to, date, passengers, travelClass }) {
    const params = new URLSearchParams({
      from: from.code,
      fromCity: from.city,
      to: to.code,
      toCity: to.city,
      date,
      passengers: String(passengers),
      travelClass,
    });
    navigate(`/results?${params.toString()}`);
  }

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Search domestic flights</h1>
        <p>Compare fares across airlines and find the best route for your trip.</p>
      </section>
      <SearchForm onSubmit={handleSubmit} />
    </div>
  );
}
