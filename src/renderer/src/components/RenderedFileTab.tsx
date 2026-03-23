/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext, useMemo } from 'react'
import { Note, FileRef, File, DeskWithContext, DeckRef, DeckConfig, Flashcard } from '@renderer/Model'
import { ListIcon, DesktopIcon, BrainIcon as StudyIcon } from '@phosphor-icons/react'
import NoteContainer from './NoteContainer'
import { Action, Actions } from './Actions'
import { ConfigContext, getDesksForFile } from '@renderer/ConfigContext'
import RenderedDeskStatic from './RenderedDeskStatic'
import RenderedFlashcards from './RenderedFlashcards'

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
  const [studying, setStudying] = useState<boolean>(false)
  const [studyFlashcards, setStudyFlashcards] = useState<Flashcard[] | null>(null)

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

  // Find the first deck config for this repository (used for SRS algorithm when studying from file)
  const firstDeckConfig: DeckConfig | undefined = useMemo(() => {
    return config.repositories[fileRef.repositorySlug]?.decks?.[0]
  }, [config, fileRef.repositorySlug])

  const firstDeckRef: DeckRef | undefined = useMemo(() => {
    if (!firstDeckConfig) return undefined
    return { repositorySlug: fileRef.repositorySlug, name: firstDeckConfig.name }
  }, [firstDeckConfig, fileRef.repositorySlug])

  const canStudy = hasFlashcards && !!firstDeckRef && !!firstDeckConfig

  const onStudyClick = async () => {
    const results = await window.api.listTodayFlashcardsForFile(fileRef)
    const shuffledFlashcards = results.sort(() => 0.5 - Math.random())
    setStudyFlashcards(shuffledFlashcards)
    setStudying(true)
  }

  const effectiveViewMode = viewMode === 'desk' && selectedDesk ? 'desk' : 'list'

  if (studying && studyFlashcards !== null && firstDeckRef && firstDeckConfig) {
    return (
      <RenderedFlashcards
        flashcards={studyFlashcards}
        deckRef={firstDeckRef}
        deckConfig={firstDeckConfig}
        onQuit={() => setStudying(false)}
      />
    )
  }

  return (
    <div>
      <Actions>
        {canStudy && (
          <Action
            icon={<StudyIcon />}
            title="Study"
            onClick={onStudyClick}
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
      {effectiveViewMode === 'desk' && file && selectedDesk && (
        <RenderedDeskStatic desk={selectedDesk} />
      )}
    </div>
  )
}

export default RenderedFileTab
