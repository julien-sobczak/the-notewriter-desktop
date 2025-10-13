import React from 'react'
import { XIcon as CloseIcon } from '@phosphor-icons/react'
import Markdown from './Markdown'
import { Action, Actions } from './Actions'
import { Note } from '@renderer/Model'

type HoveredNoteProps = {
  note: Note
  onClose?: (event: React.MouseEvent) => void
}

export default function HoveredNote({ note, onClose = () => {} }: HoveredNoteProps) {
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
  )
}
