import { Note, Media } from 'shared/model/Note';
import NotFound from '../../assets/404.svg';

// eslint-disable-next-line import/prefer-default-export
export function formatContent(note: Note, tags: string[] = []): string {
  // Regex to locate media references
  const re: RegExp = /oid:([a-zA-Z0-9]{40})/g;
  let m: RegExpExecArray | null;

  const mediasByOids = new Map<string, Media>();
  note.medias.forEach((media) => mediasByOids.set(media.oid, media));

  // Find note OIDs
  const noteOids = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    m = re.exec(note.content);
    if (m == null) {
      break;
    }
    noteOids.push(m[1]);
  }

  // Replace by valid paths
  let result = note.content;
  for (const oid of noteOids) {
    let found = false;

    const media = mediasByOids.get(oid);
    if (media) {
      // Media exists

      // Try to find a blob matching every tags
      for (const blob of media.blobs) {
        if (tags.every((tag) => blob.tags.includes(tag))) {
          // Found a potential blob
          const prefix = blob.oid.substring(0, 2);
          result = result.replace(
            `oid:${oid}`,
            `file:${note.workspacePath}/.nt/objects/${prefix}/${blob.oid}`
          );
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // 404 or dangling media or missing blob
      if (media) {
        console.log(`Missing media ${oid}`);
      } else {
        console.log(
          `Missing blob for media ${oid} matching "${tags.join(',')}"`
        );
      }

      result = result.replace(`oid:${oid}`, NotFound);
    }
  }

  return result;
}

// See https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example/
type RenderedNoteProps = {
  note: Note;
};

export default function RenderedNote(props: RenderedNoteProps) {
  const { note } = props;
  return (
    <div
      className="RenderedNote"
      key={note.oid}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: formatContent(note, ['preview']) }}
    />
  );
}
