import { useEffect } from 'react';

function Hi() {
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
    <div className="Hi">
      <h1>Hi!</h1>
    </div>
  );
}

export default Hi;
