import { useState, useEffect } from 'react';
import DailyQuote from './DailyQuote';
import StaticDesk from './StaticDesk';
import Workspace from './Workspace';
import { Query } from '../shared/model/Query';

export default function Home() {
  // Example to demonstrate how to join the API
  // TODO remove this code
  useEffect(() => {
    // Example 1
    fetch('http://localhost:3000/status')
      .then((response) => response.json())
      .then((data) => console.log('HTTP status', data))
      .catch((error) => console.log('Error:', error));
    const query: Query = {
      q: 'go',
      workspaces: [],
      blockId: undefined,
      deskId: undefined,
    };

    // Example 2
    fetch('http://localhost:3000/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })
      .then((response) => response.json())
      .then((data) => console.log('HTTP search', data))
      .catch((error) => console.log('Error:', error));
  }, []);

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
