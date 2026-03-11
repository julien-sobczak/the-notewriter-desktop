/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext, useMemo } from 'react'
import { Note, FileRef, File, DeskWithContext } from '@renderer/Model'
import { ListIcon, DesktopIcon, BrainIcon as StudyIcon } from '@phosphor-icons/react'
import NoteContainer from './NoteContainer'
import { Action, Actions } from './Actions'
import { ConfigContext, getDesksForFile } from '@renderer/ConfigContext'
import RenderedDesk from './RenderedDesk'

type RenderedFileTabProps = {
  title: string
  file: FileRef
  relativePath: string
}

function RenderedFileTab(props: RenderedFileTabProps) {
  const { config } = useContext(ConfigContext)

  const relativePath = props.relativePath
  const fileRef = props.file
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'desk'>('list')
  const [desks, setDesks] = useState<DeskWithContext[]>([])
  const [selectedDesk, setSelectedDesk] = useState<DeskWithContext | null>(null)

  useEffect(() => {
    if (!fileRef.repositorySlug || !relativePath) return

    const findFile = async () => {
      const result: File = await window.api.findFile(fileRef)
      setFile(result)

      // Load available desks for this file
      setDesks(getDesksForFile(config, result))
      // Select the first desk by default if available
      if (desks.length > 0) {
        setSelectedDesk(desks[0])
      }
    }
    const listNotesInFile = async () => {
      const result: Note[] = await window.api.listNotesInFile(fileRef.repositorySlug, relativePath)
      setNotes(result)
    }
    findFile()
    listNotesInFile()
  }, [fileRef, relativePath])

  const hasFlashcards = useMemo(() => {
    return notes.some((note) => note.type === 'Flashcard')
  }, [notes])

  const effectiveViewMode = viewMode === 'desk' && selectedDesk ? 'desk' : 'list'

  return (
    <div>
      <Actions>
        {hasFlashcards && (
          <Action
            icon={<StudyIcon />}
            title="Study flashcard"
            onClick={() => alert('Not implemented yet')}
          />
        )}
        <Action icon={<ListIcon />} title="List View" onClick={() => setViewMode('list')} />
        <Action icon={<DesktopIcon />} title="Desk View" onClick={() => setViewMode('desk')} />
      </Actions>
      {viewMode === 'desk' && (
        <select
          value={selectedDesk?.name || ''}
          onChange={(e) => {
            const desk = desks.find((d) => d.name === e.target.value)
            setSelectedDesk(desk || null)
          }}
        >
          {desks.map((desk) => (
            <option key={desk.name} value={desk.name}>
              {desk.name}
            </option>
          ))}
        </select>
      )}
      {effectiveViewMode === 'list' && (
        <NoteContainer notes={notes} layout="list" layoutSelectable={true} />
      )}
      {effectiveViewMode === 'desk' && file && selectedDesk && <RenderedDesk desk={selectedDesk} />}
    </div>
  )
}

export default RenderedFileTab
