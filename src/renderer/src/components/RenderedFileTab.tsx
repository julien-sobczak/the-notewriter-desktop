/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext } from 'react'
import { Note, FileRef } from '@renderer/Model'
import NoteContainer from './NoteContainer'

type RenderedFileTabProps = {
  title: string
  file: FileRef
  relativePath: string
}

function RenderedFileTab({ title, file, relativePath }: RenderedFileTabProps) {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (!file.repositorySlug || !relativePath) return

    const listNotesInFile = async () => {
      const result: Note[] = await window.api.listNotesInFile(
        file.repositorySlug,
        relativePath
      )
      setNotes(result)
    }
    listNotesInFile()
  }, [file.repositorySlug, relativePath])

  return <NoteContainer notes={notes} layout="list" layoutSelectable={true} />
}

export default RenderedFileTab
