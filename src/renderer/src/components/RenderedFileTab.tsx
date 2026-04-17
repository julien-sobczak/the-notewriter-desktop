/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext, useMemo } from 'react'
import { Note, FileRef, File, DeskWithContext, Flashcard, Review } from '@renderer/Model'
import {
  ListIcon,
  DesktopIcon,
  BrainIcon as StudyIcon,
  XIcon as CloseIcon
} from '@phosphor-icons/react'
import NoteContainer from './NoteContainer'
import { Action, Actions } from './Actions'
import { ConfigContext, getDesksForFile } from '@renderer/ConfigContext'
import RenderedDeskStatic from './RenderedDeskStatic'
import RenderedStudy from './RenderedStudy'

type RenderedFileTabProps = {
  title: string
  file: FileRef
  relativePath: string
}

type FileTabView = 'list' | 'desk' | 'test' | 'score'

type TestScore = {
  total: number
  sumConfidence: number
}

function RenderedScore({ score, onClose }: { score: TestScore; onClose: () => void }) {
  const scorePercent = score.total > 0 ? Math.round(score.sumConfidence / score.total) : 0
  const message =
    scorePercent >= 75
      ? `Congratulations! You got ${scorePercent}%`
      : `Need to study... You got ${scorePercent}%`
  return (
    <div>
      <Actions>
        <Action icon={<CloseIcon />} title="Close" onClick={onClose} />
      </Actions>
      <div className="TestScore">
        <p>{message}</p>
      </div>
    </div>
  )
}

function RenderedFileTab(props: RenderedFileTabProps) {
  const { config } = useContext(ConfigContext)

  const relativePath = props.relativePath
  const fileRef = props.file
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [viewMode, setViewMode] = useState<FileTabView>('list')
  const [desks, setDesks] = useState<DeskWithContext[]>([])
  const [selectedDesk, setSelectedDesk] = useState<DeskWithContext | null>(null)
  const [testFlashcards, setTestFlashcards] = useState<Flashcard[]>([])
  const [testScore, setTestScore] = useState<TestScore>({
    total: 0,
    sumConfidence: 0
  })

  useEffect(() => {
    if (!fileRef.repositorySlug || !relativePath) return

    const findFile = async () => {
      const result: File = await window.api.findFile(fileRef)
      setFile(result)

      // Load available desks for this file
      const fileDesks = getDesksForFile(config, result)
      setDesks(fileDesks)
      // Select the first desk by default if available
      if (fileDesks.length > 0) {
        setSelectedDesk(fileDesks[0])
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

  const startTest = async () => {
    const results = await window.api.listTodayFlashcardsForFile(fileRef)
    const shuffledFlashcards = results.sort(() => 0.5 - Math.random())
    setTestFlashcards(shuffledFlashcards)
    setTestScore({ total: 0, sumConfidence: 0 })
    setViewMode('test')
  }

  const onTestReview = (_flashcard: Flashcard, review: Review) => {
    setTestScore((prev) => ({
      total: prev.total + 1,
      sumConfidence: prev.sumConfidence + review.confidence
    }))
  }

  const onTestQuit = () => {
    setViewMode('score')
  }

  const effectiveViewMode = viewMode === 'desk' && selectedDesk ? 'desk' : viewMode

  if (viewMode === 'test') {
    return (
      <div className="FullScreen">
        <RenderedStudy
          flashcards={testFlashcards}
          mode="test"
          onReview={onTestReview}
          onQuit={onTestQuit}
        />
      </div>
    )
  }

  if (viewMode === 'score') {
    return (
      <div className="FullScreen">
        <RenderedScore score={testScore} onClose={() => setViewMode('list')} />
      </div>
    )
  }

  return (
    <div>
      <Actions>
        {hasFlashcards && <Action icon={<StudyIcon />} title="Test Yourself" onClick={startTest} />}
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

