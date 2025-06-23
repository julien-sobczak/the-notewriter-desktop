import { useEffect } from 'react';

function Planner() {
  useEffect(() => {
    // TODO implement
    // Ex: Retrieve a random quote
    const getDailyQuote = async () => {
      if (!window.electron) return;
      await window.electron.getDailyQuote();
    };
    getDailyQuote();
  }, []);

  return (
    <div className="Planner">
      <h1>Inspiration!</h1>
    </div>
  );
}

export default Planner;
