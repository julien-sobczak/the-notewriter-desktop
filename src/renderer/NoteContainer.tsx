import { Note } from 'shared/model/Note';
import RenderedNote from './RenderedNote';

type NotesContainerProps = {
  notes: Note[] | undefined;
};

function NotesContainer({ notes }: NotesContainerProps) {
  return (
    <div>
      {notes?.map((note: Note) => {
        return <RenderedNote key={note.oid} note={note} layout="grid" />;
      })}
    </div>
  );
}

export default NotesContainer;
