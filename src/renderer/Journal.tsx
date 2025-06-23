import { useEffect } from 'react';

function Journal() {
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
    <div className="Journal">
      <h1>Journal!</h1>
    </div>
  );
}

export default Journal;
