import { NoteRef, Note } from '@renderer/Model'
import NoteContainer from './NoteContainer'
import { useState, useEffect } from 'react'

type RenderedNotesTabProps = {
  title: string
  notes: NoteRef[]
  query: string
}

function RenderedNotesTab({ notes: noteRefs, query }: RenderedNotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    // Load the notes based on the noteRefs in the tab
    const loadNotes = async () => {
      if (!noteRefs || noteRefs.length === 0) {
        setNotes([])
        return
      }
      const result: Note[] = await window.api.mfind(noteRefs)
      setNotes(result)
    }
    loadNotes()
  }, [noteRefs])

  return <NoteContainer name={query} notes={notes} layout="list" layoutSelectable={true} />
}

export default RenderedNotesTab
