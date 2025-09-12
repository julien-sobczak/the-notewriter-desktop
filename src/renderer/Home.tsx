import { useState } from 'react';
import DailyQuote from './DailyQuote';
import Main from './Main';

export default function Home() {
  const [showDailyQuote, setShowDailyQuote] = useState(
    window.electron.env.NT_SKIP_DAILY_QUOTE !== 'true',
  );
  return (
    <>
      {showDailyQuote && (
        <DailyQuote onClose={() => setShowDailyQuote(false)} />
      )}
      {!showDailyQuote && <Main />}
    </>
  );
}
