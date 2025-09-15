import React from 'react';
import { PencilSimple as Pencil } from '@phosphor-icons/react';
import { Note, ListItem } from '../shared/Model';
import Markdown from './Markdown';
import { RenderedAttributes, RenderedTags } from './RenderedMetadata';

type RenderedListItemProps = {
  note: Note;
  item: ListItem;
};

function RenderedListItem({ note, item }: RenderedListItemProps) {
  const handleEdit = () => {
    if (window.electron && window.electron.edit) {
      window.electron.edit(note.repositorySlug, note.relativePath, item.line);
    }
  };

  return (
    <div className="RenderedListItem">
      {/* Item text rendered as Markdown */}
      <div className="ItemText">
        <Markdown md={item.text} />
      </div>

      {/* Item attributes */}
      {item.attributes && Object.keys(item.attributes).length > 0 && (
        <div className="ItemAttributes">
          <RenderedAttributes
            attributes={item.attributes}
            repositoryConfig={{} as any} // TODO: Get proper repository config if needed
          />
        </div>
      )}

      {/* Item tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="ItemTags">
          <RenderedTags tags={item.tags} />
        </div>
      )}

      {/* Edit button */}
      <button
        type="button"
        className="EditButton"
        onClick={handleEdit}
        title="Edit item"
      >
        <Pencil />
      </button>
    </div>
  );
}

export default RenderedListItem;
