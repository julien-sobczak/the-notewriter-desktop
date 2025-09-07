/* eslint-disable jsx-a11y/mouse-events-have-key-events */
import React from 'react';
import { X as CloseIcon } from '@phosphor-icons/react';
import Markdown from './Markdown';
import { Note } from '../shared/Model';
import { Action, Actions } from './Actions';

type HoveredNoteProps = {
  note: Note;
  onClose?: (event: React.MouseEvent) => void;
};

export default function HoveredNote({
  note,
  onClose = () => {},
}: HoveredNoteProps) {
  return (
    <div className="HoveredNote">
      <Actions>
        <Action icon={<CloseIcon />} onClick={onClose} />
      </Actions>
      <div>
        <Markdown md={note.longTitle} />
        <hr />
        <Markdown md={note.body} />
      </div>
    </div>
  );
}
