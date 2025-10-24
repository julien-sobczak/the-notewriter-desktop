import { NotesTab, Note } from '@renderer/Model'
import NoteContainer from './NoteContainer'
import { useState, useEffect } from 'react'

type RenderedNotesTabProps = {
  tab: NotesTab
}

function RenderedNotesTab({ tab }: RenderedNotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    // Load the notes based on the noteRefs in the tab
    const loadNotes = async () => {
      // For now, we'll need to implement a way to load notes by their refs
      // This is a placeholder implementation
      // TODO: Implement proper note loading by refs
      setNotes([])
    }
    loadNotes()
  }, [tab.notes])

  return <NoteContainer name={tab.query} notes={notes} layout="list" layoutSelectable={true} />
}

export default RenderedNotesTab
