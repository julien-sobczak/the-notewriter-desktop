import { useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import DailyQuote from './DailyQuote';
import StaticDesk from './StaticDesk';
import Workspace from './Workspace';
import { ConfigContextProvider } from './ConfigContext';
import './Reset.css';
import './App.css';

function Home() {
  const [showDailyQuote, setShowDailyQuote] = useState(true);
  return (
    <>
      {showDailyQuote && (
        <DailyQuote onClose={() => setShowDailyQuote(false)} />
      )}
      {!showDailyQuote && <Workspace />}
      {true && false && <StaticDesk />} {/* TODO remove */}
    </>
  );
}

export default function App() {
  return (
    <ConfigContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </ConfigContextProvider>
  );
}
