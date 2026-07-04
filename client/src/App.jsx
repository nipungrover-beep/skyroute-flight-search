import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/" data-testid="brand-home-link">
          SkyRoute
        </a>
        <span className="tagline">Domestic flight search</span>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </main>
    </div>
  );
}
