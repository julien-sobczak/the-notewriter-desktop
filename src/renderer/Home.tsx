import { useState } from 'react';
import DailyQuote from './DailyQuote';
import Main from './Main';

export default function Home() {
  const [showDailyQuote, setShowDailyQuote] = useState(true);
  return (
    <>
      {showDailyQuote && (
        <DailyQuote onClose={() => setShowDailyQuote(false)} />
      )}
      {!showDailyQuote && <Main />}
    </>
  );
}
