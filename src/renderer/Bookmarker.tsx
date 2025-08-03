/* eslint-disable react/no-danger */
import { useEffect, useState, useContext } from 'react';
import classNames from 'classnames';
import {
  Bookmark,
  Note,
  NoteRef,
  QueryResult,
  RepositoryRefConfig,
} from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import NoteType from './NoteType';
import RenderedNote from './RenderedNote';
import Markdown from './Markdown';

type BookmarkerProps = {
  bookmark: Bookmark | undefined | null;
};

function Bookmarker({ bookmark }: BookmarkerProps) {
  const { config } = useContext(ConfigContext);
  const staticConfig = config.static;

  // Read saved bookmarks in the dynamic configuration
  const { bookmarks } = config.dynamic;
  // Read bookmarks statically defined in notes
  const [notes, setNotes] = useState<Note[]>([]);

  const [selectedBookmark, setSelectedBookmark] = useState<
    Bookmark | null | undefined
  >(bookmark);
  // The note corresponding to the currently selected bookmark
  const [selectedNote, setSelectedNote] = useState<Note | null>();

  // Retrieve static bookmarks from the database
  useEffect(() => {
    const selectedRepositorySlugs = staticConfig.repositories
      .filter((repository: RepositoryRefConfig) => repository.selected)
      .map((repository: RepositoryRefConfig) => repository.slug);

    const search = async () => {
      console.log(`Searching for bookmarks in database...`);
      const results: QueryResult = await window.electron.search({
        q: '#bookmark',
        repositories: selectedRepositorySlugs,
        deskId: null,
        blockId: null,
        limit: 0,
        shuffle: false,
      });
      console.info(`Found ${results.notes.length} note(s)...`);
      setNotes(results.notes);
    };
    search();
  }, [staticConfig.repositories]);

  // Download the note corresponding to the selected bookmark
  useEffect(() => {
    if (!selectedBookmark) return;

    console.log(`Searching for bookmark ${selectedBookmark.noteOID}...`);
    const noteRef: NoteRef = {
      repositorySlug: selectedBookmark.repositorySlug,
      oid: selectedBookmark.noteOID,
    };
    const find = async () => {
      const note: Note = await window.electron.find(noteRef);
      setSelectedNote(note);
      console.log(`Found note ${note.oid} ${note.longTitle}...`);
    };
    find();
  }, [selectedBookmark]);

  const handleBookmarkClick = (newSelectedBookmark: Bookmark) => {
    setSelectedBookmark(newSelectedBookmark);
    setSelectedNote(null); // Reset selected note when changing bookmark
    // The note will be loaded in the useEffect above
  };

  const handleNoteClick = (newSelectedNote: Note) => {
    setSelectedNote(newSelectedNote);
    setSelectedBookmark(null); // Reset selected bookmark when changing note
  };

  return (
    <div className="Bookmarker">
      <div className="LeftPanel">
        {((bookmarks?.length ?? 0) > 0 || (notes?.length ?? 0) > 0) && (
          <ul>
            {notes.map((note: Note) => (
              <li
                key={note.oid}
                className={classNames({
                  selected: selectedNote && selectedNote.oid === note.oid,
                })}
                onClick={() => handleNoteClick(note)}
              >
                <NoteType value={note.type} />
                &nbsp;
                <span className="BookmarkTitle">
                  <Markdown md={note.longTitle} inline />
                </span>
                <br />
                <span className="BookmarkRelativePath">
                  {note.relativePath}
                </span>
              </li>
            ))}
            {(bookmarks ?? []).map((savedBookmark: Bookmark) => (
              <li
                key={savedBookmark.noteOID}
                className={classNames({
                  selected:
                    selectedBookmark &&
                    selectedBookmark.noteOID === savedBookmark.noteOID,
                })}
                onClick={() => handleBookmarkClick(savedBookmark)}
              >
                <NoteType value={savedBookmark.noteType} />
                &nbsp;
                <span className="BookmarkTitle">
                  <Markdown md={savedBookmark.noteLongTitle} inline />
                </span>
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
