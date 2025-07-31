import React, { useContext } from 'react';
import { getAttributeConfig, Note } from '../shared/Model';
import Markdown from './Markdown';
import { ConfigContext } from './ConfigContext';

// List of attributes that must be hidden (as duplicating information already displayed elsewhere)
const omitAttributes = ['tags', 'title'];

type RenderedMetadataProps = {
  note: Note;
  showTags?: boolean;
  showAttributes?: boolean;
};

function RenderedMetadata({
  note,
  showTags = true,
  showAttributes = true,
}: RenderedMetadataProps) {
  const { config } = useContext(ConfigContext);
  const repositoryConfig = config.repositories[note.repositorySlug];

  // Remove extra attributes
  const filteredAttributes = Object.fromEntries(
    Object.entries(note.attributes).filter(
      ([key]) => !omitAttributes.includes(key),
    ),
  );

  const noteHasMetadata = note.tags || filteredAttributes;

  if (!noteHasMetadata || (!showTags && !showAttributes)) {
    return null;
  }

  return (
    <div className="RenderedNoteMetadata">
      {showTags && note.tags && note.tags.length > 0 && (
        <ul>
          {note.tags.map((tag: string) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      )}
      {showAttributes &&
        filteredAttributes &&
        Object.keys(filteredAttributes).length > 0 && (
          <ul>
            {Object.entries(filteredAttributes).map(([key, value]: any) => {
              const attributeConfig = getAttributeConfig(repositoryConfig, key);
              return (
                <li key={key}>
                  @{key}:{' '}
                  {attributeConfig.type === 'string' && (
                    <Markdown md={value} inline />
                  )}
                  {attributeConfig.type !== 'string' && <span>{value}</span>}
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}

export default RenderedMetadata;
