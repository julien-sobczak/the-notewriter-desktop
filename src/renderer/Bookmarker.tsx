/* eslint-disable react/no-danger */
import { useEffect, useState, useContext } from 'react';
import classNames from 'classnames';
import { Bookmark, Note, NoteRef } from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import NoteKind from './NoteKind';
import RenderedNote from './RenderedNote';

type BookmarkerProps = {
  bookmark: Bookmark | undefined | null;
};

function Bookmarker({ bookmark }: BookmarkerProps) {
  const { config } = useContext(ConfigContext);

  // Read saved bookmarks
  const { bookmarks } = config.dynamic;

  const [selectedBookmark, setSelectedBookmark] = useState<
    Bookmark | null | undefined
  >(bookmark);
  // The note corresponding to the currently selected bookmark
  const [selectedNote, setSelectedNote] = useState<Note | null>();

  useEffect(() => {
    if (!selectedBookmark) return;

    console.log(`Searching for bookmark ${selectedBookmark.noteOID}...`);
    const noteRef: NoteRef = {
      workspaceSlug: selectedBookmark.workspaceSlug,
      oid: selectedBookmark.noteOID,
    };
    fetch('http://localhost:3000/find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteRef),
    })
      .then((response) => response.json())
      .then((result: Note) => {
        console.log(`Found note ${result.oid}`); // FIXME now why never called???????
        setSelectedNote(result);
        return null;
      })
      .catch((error: any) => console.log('Error:', error));
  }, [selectedBookmark]);

  const handleBookmarkClick = (newSelectedBookmark: Bookmark) => {
    setSelectedBookmark(newSelectedBookmark);
  };

  return (
    <div className="Bookmarker">
      <div className="LeftPanel">
        {bookmarks && (
          <ul>
            {bookmarks.map((savedBookmark) => (
              <li
                key={savedBookmark.noteOID}
                className={classNames({
                  selected:
                    selectedBookmark &&
                    selectedBookmark.noteOID === savedBookmark.noteOID,
                })}
                onClick={() => handleBookmarkClick(savedBookmark)}
              >
                <NoteKind value={savedBookmark.noteKind} />
                &nbsp;
                <span
                  className="BookmarkTitle"
                  dangerouslySetInnerHTML={{ __html: savedBookmark.noteTitle }}
                />
                <br />
                <span className="BookmarkRelativePath">
                  {savedBookmark.noteRelativePath}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* The main panel to view the corresponding note */}
      <div className="BookmarkerViewer">
        {selectedNote && (
          // TODO use a wrapper to show more (backlinks, etc.)
          <RenderedNote note={selectedNote} />
        )}
      </div>
    </div>
  );
}

export default Bookmarker;
