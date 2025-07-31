import { useState, useEffect } from 'react';
import { Quotes } from '@phosphor-icons/react';
import { Note } from '../shared/Model';
import useKeyDown from './useKeyDown';
import Markdown from './Markdown';
import RenderedMetadata from './RenderedMetadata';

function DailyQuote({ onClose }: any) {
  const [dailyQuote, setDailyQuote] = useState<Note | undefined>(undefined);

  useEffect(() => {
    // Retrieve a random quote
    const getDailyQuote = async () => {
      if (!window.electron) return;
      const note = await window.electron.getDailyQuote();
      setDailyQuote(note);
    };
    getDailyQuote();
  }, []);

  // Close after one minute
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 60000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // or close after pressing enter
  useKeyDown(() => {
    onClose();
  }, ['Enter']);

  return (
    <div className="DailyQuote">
      {dailyQuote && (
        <>
          <div className="DailyQuoteContent">
            <span className="DailyQuoteSymbol">
              <Quotes size={32} weight="fill" color="darkblue" />
            </span>
            <Markdown md={dailyQuote.body} />
            {dailyQuote.attributes?.author && (
              <span className="DailyQuoteAuthor">
                {dailyQuote.attributes.author}
              </span>
            )}
            {dailyQuote.attributes?.name && (
              <span className="DailyQuoteAuthor">
                {dailyQuote.attributes.name}
              </span>
            )}
          </div>
          <div className="DailyQuoteMetadata">
            <RenderedMetadata note={dailyQuote} showAttributes />
          </div>
          <div className="DailyQuoteTitle">
            <Markdown md={dailyQuote.longTitle} inline />
          </div>
        </>
      )}
    </div>
  );
}

export default DailyQuote;
