import { useEffect } from 'react';

function Reminders() {
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
    <div className="Reminders">
      <h1>Reminders!</h1>
    </div>
  );
}

export default Reminders;
