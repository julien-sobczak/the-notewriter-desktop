import { useState, useMemo } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { IconContext, IconProps } from '@phosphor-icons/react';
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
  const iconStyle = useMemo<IconProps>(() => {
    return {
      color: 'black',
      size: 16,
      weight: 'thin',
      mirrored: false,
    };
  }, []);
  return (
    <IconContext.Provider value={iconStyle}>
      <ConfigContextProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Router>
      </ConfigContextProvider>
    </IconContext.Provider>
  );
}
