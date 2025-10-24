/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext } from 'react'
import { Note } from '@renderer/Model'
import { FileTab } from '@renderer/Model'
import NoteContainer from './NoteContainer'

type RenderedFileTabProps = {
  tab: FileTab
}

function RenderedFileTab({ tab }: RenderedFileTabProps) {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (!tab.file.repositorySlug || !tab.relativePath) return

    const listNotesInFile = async () => {
      const result: Note[] = await window.api.listNotesInFile(
        tab.file.repositorySlug,
        tab.relativePath
      )
      setNotes(result)
    }
    listNotesInFile()
  }, [tab.file.repositorySlug, tab.relativePath])

  return <NoteContainer notes={notes} layout="list" layoutSelectable={true} />
}

export default RenderedFileTab
