import { PiPencil as EditIcon } from 'react-icons/pi';
import classNames from 'classnames';
import { Note, Media } from 'shared/model/Note';
import NotFound from '../../assets/404.svg';
import { capitalize } from './helpers';

// eslint-disable-next-line import/prefer-default-export
export function formatContent(note: Note, tags: string[] = []): string {
  // Regex to locale links to append target="_blank"
  // Ex: <a href="www.google.com"> => <a target="_blank" href="www.google.com">
  // This allows the main process to capture links and redirect to the browser
  // instead of opening them in the Electron application.
  const reLinks: RegExp = /<a /g;
  note.content = note.content.replaceAll(reLinks, '<a target="_blank" ');

  // Regex to locate media references
  const reOids: RegExp = /oid:([a-zA-Z0-9]{40})/g;
  let m: RegExpExecArray | null;

  const mediasByOids = new Map<string, Media>();
  note.medias.forEach((media) => mediasByOids.set(media.oid, media));

  // Find note OIDs
  const noteOids = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    m = reOids.exec(note.content);
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

// List of attributes that must be hidden (as duplicating information already displayed elsewhere)
const omitAttributes = ['tags', 'title'];

// See https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example/
type RenderedNoteProps = {
  // Content
  note: Note;
  // Style
  layout?: string;
  showTags?: boolean;
  showAttributes?: boolean;
  // Container
  draggable?: boolean;
};

export default function RenderedNote({
  note,
  layout = 'default',
  showTags = true,
  showAttributes = true,
  draggable = false,
}: RenderedNoteProps) {
  // Remove extra attributes
  const filteredAttributes = Object.fromEntries(
    Object.entries(note.attributes).filter(
      ([key]) => !omitAttributes.includes(key)
    )
  );

  const noteHasMetadata = note.tags || filteredAttributes;
  const metadataVisible = showTags || showAttributes;
  return (
    <div
      className={classNames(['RenderedNote', `Layout${capitalize(layout)}`])}
      key={note.oid}
      draggable={draggable ? 'true' : 'false'}
    >
      <div className="Actions">
        <nav>
          <ul>
            <li>
              <button type="button">
                <EditIcon />
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div
        className="RenderedNoteTitle"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: note.title }}
      />
      <div
        className="RenderedNoteContent"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: formatContent(note, ['preview']) }}
      />
      {metadataVisible && noteHasMetadata && (
        <div className="RenderedNoteMetadata">
          {showTags && note.tags && (
            <ul>
              {note.tags.map((tag: string) => {
                return <li key={tag}>#{tag}</li>;
              })}
            </ul>
          )}
          {showAttributes && filteredAttributes && (
            <ul>
              {Object.entries(filteredAttributes).map(([key, value]: any) => {
                return (
                  <li key={key}>
                    @{key}: {value}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {note.comment && (
        <div
          className="RenderedNoteComment"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: note.comment }}
        />
      )}
    </div>
  );
}
