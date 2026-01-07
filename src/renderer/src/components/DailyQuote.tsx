import { useState, useEffect, useContext } from 'react'
import { Note, Query } from '@renderer/Model'
import FullScreenNote from './FullScreenNote'
import useKeyDown from '@renderer/helpers/useKeyDown'
import { ConfigContext, selectedDailyQuotes } from '@renderer/ConfigContext'

// No daily quote query can be defined in configuration, or no quote found by the query.
// We fallback to a memento mori quote.
const defaultDailyNote: Note = {
  oid: '0000000000000000000000000000000000000000',
  oidFile: '0000000000000000000000000000000000000000',
  slug: 'fake-daily-quote',
  repositorySlug: '',
  repositoryPath: '',
  type: 'Quote',
  title: 'Quote: Memento Mori',
  longTitle: 'Memento Mori',
  shortTitle: 'Memento Mori',
  relativePath: '',
  wikilink: '',
  attributes: {},
  tags: [],
  line: 1,
  content:
    '> You could leave life right now. Let that determine what you do and say and think.\n> — Marcus Aurelius',
  body: '> You could leave life right now. Let that determine what you do and say and think.\n> — Marcus Aurelius',
  comment: '',
  marked: false,
  annotations: [],
  medias: []
}

function DailyQuote({ onClose }: any) {
  const { config } = useContext(ConfigContext)
  const [dailyQuote, setDailyQuote] = useState<Note | undefined>(undefined)

  useEffect(() => {
    const queries = selectedDailyQuotes(config)

    if (queries.length === 0) {
      // Return a fake note with a Marcus Aurelius quote
      setDailyQuote(defaultDailyNote)
      return
    }

    // If multiple queries have the tag, choose one randomly
    const randomQuery = queries[Math.floor(Math.random() * queries.length)]

    const query: Query = {
      q: randomQuery.q,
      repositories: [randomQuery.repositorySlug],
      blockOid: undefined,
      deskOid: undefined,
      limit: 1,
      shuffle: true
    }
    // Retrieve a random quote
    const getDailyQuote = async () => {
      if (!window.electron) return
      const result = await window.api.search(query)
      if (result.notes.length === 0) setDailyQuote(defaultDailyNote)
      setDailyQuote(result.notes[0])
    }
    getDailyQuote()
  }, [config])

  // Close after one minute
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 60000)
    return () => clearTimeout(timer)
  }, [onClose])

  // or close after pressing enter
  useKeyDown(() => {
    onClose()
  }, ['Enter'])

  return <div className="DailyQuote">{dailyQuote && <FullScreenNote note={dailyQuote} />}</div>
}

export default DailyQuote
