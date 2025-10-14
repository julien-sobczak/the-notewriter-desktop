import React from 'react'
import { PencilSimpleIcon as EditIcon } from '@phosphor-icons/react'
import { Note } from '@renderer/Model'
import RenderedNote from './RenderedNote'
import Markdown from './Markdown'

type FullScreenNoteProps = {
  note: Note
}

/*
 * Zen Mode display random notes in full-screen mode at a repeated interval.
 * The screen can be exited by click on the stop button or pressing ESC.
 * Controls are available to adjust the speed of rendered notes.
 * These notes are rendered in a minimal style with minimal context present
 * in the footer.
 */
function FullScreenNote({ note }: FullScreenNoteProps) {
  // Triggered when the user clicks in the footer to browse to the file externally
  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (!note) return
    window.api.edit(note.repositorySlug, note.relativePath, note.line)
  }

  return (
    <div className="FullScreenNote">
      <div className="FullScreenNoteContent">
        {/* Disable all "extra" information */}
        <RenderedNote
          note={note}
          showAttributes={false}
          showTags={false}
          showActions={false}
          showComment={false}
          showTitle={false}
        />
      </div>
      <div className="FullScreenNoteFooter">
        <div>
          <Markdown md={note.title} />
          <br />
          <span>
            <strong>{note.repositorySlug}</strong>&nbsp;/&nbsp;
            {note.relativePath}
          </span>
        </div>
        <div>
          <button type="button" title="Edit in external editor" onClick={handleEdit}>
            <EditIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FullScreenNote
