import React, { useContext } from 'react';
import { getAttributeConfig, Note, RepositoryConfig } from '../shared/Model';
import Markdown from './Markdown';
import { ConfigContext } from './ConfigContext';

// List of attributes that must be hidden (as duplicating information often displayed elsewhere)
const defaultOmitAttributes = ['tags', 'title'];

// Utility to filter out some attributes
export function filterAttributes(
  attributes: Record<string, any>,
  omitAttributes: string[] = defaultOmitAttributes,
) {
  return Object.fromEntries(
    Object.entries(attributes).filter(([key]) => !omitAttributes.includes(key)),
  );
}

/*
 * <RenderedTags />
 */

type RenderedTagsProps = {
  tags: string[];
};

// Component to render a list of tags
export function RenderedTags({ tags }: RenderedTagsProps) {
  if (!tags || tags.length === 0) return null;
  return (
    <ul className="RenderedTags">
      {tags.map((tag: string) => (
        <li key={tag}>#{tag}</li>
      ))}
    </ul>
  );
}

/*
 * <RenderedAttributes />
 */

type RenderedAttributesProps = {
  attributes: Record<string, any>;
  omitAttributes?: string[];
  repositoryConfig: RepositoryConfig;
};

// Component to render a list of attributes
export function RenderedAttributes({
  attributes,
  omitAttributes = defaultOmitAttributes,
  repositoryConfig,
}: RenderedAttributesProps) {
  // Remove extra attributes
  const filteredAttributes = filterAttributes(attributes, omitAttributes);
  if (!filteredAttributes || Object.keys(filteredAttributes).length === 0)
    return null;
  return (
    <ul className="RenderedAttributes">
      {Object.entries(filteredAttributes).map(([key, value]: any) => {
        const attributeConfig = getAttributeConfig(repositoryConfig, key);
        return (
          <li key={key}>
            @{key}:{' '}
            {attributeConfig.type === 'string' ? (
              <Markdown md={value} inline />
            ) : (
              <span>{value}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/*
 * <RenderedMetadata />
 */

type RenderedMetadataProps = {
  note: Note;
  showTags?: boolean;
  showAttributes?: boolean;
};

// Component to render the metadata of a note (tags and attributes)
function RenderedMetadata({
  note,
  showTags = true,
  showAttributes = true,
}: RenderedMetadataProps) {
  const { config } = useContext(ConfigContext);
  const repositoryConfig = config.repositories[note.repositorySlug];

  const filteredAttributes = filterAttributes(note.attributes);
  const noteHasMetadata = note.tags || filteredAttributes;

  if (!noteHasMetadata || (!showTags && !showAttributes)) {
    return null;
  }

  return (
    <div className="RenderedMetadata">
      {showTags && note.tags && <RenderedTags tags={note.tags} />}
      {showAttributes && filteredAttributes && (
        <RenderedAttributes
          attributes={filteredAttributes}
          repositoryConfig={repositoryConfig}
        />
      )}
    </div>
  );
}

export default RenderedMetadata;
