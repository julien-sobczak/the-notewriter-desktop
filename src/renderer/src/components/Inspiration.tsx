import { useContext, useState } from 'react'
import { EraserIcon, SkipBackIcon, SkipForwardIcon, SmileyXEyesIcon } from '@phosphor-icons/react'
import { InspirationConfig, Note, Query, QueryResult } from '@renderer/Model'
import { ConfigContext } from '@renderer/ConfigContext'
import useKeyDown from '@renderer/helpers/useKeyDown'
import FullScreenNote from './FullScreenNote'
import { Action, Actions } from './Actions'
import Question from './Question'

function extractQuery(inspiration: InspirationConfig): Query {
  // Convert all queries configured into valid Query
  const result: Query = {
    q: inspiration.query,
    repositories: inspiration.repositories ? inspiration.repositories : [],
    deskOid: undefined,
    blockOid: undefined,
    limit: 1000, // 1000 notes must be enough
    shuffle: true // Important!
  }
  return result
}

function Inspiration() {
  const { config } = useContext(ConfigContext)
  const { inspirations } = config.static

  const [selectedCategory, setSelectedCategory] = useState<string>()
  const [notes, setNotes] = useState<Note[]>([])
  const [index, setIndex] = useState<number>(0) // 0 <= index < note.length

  // Support navigation using keys
  useKeyDown(() => {
    handlePrevious()
  }, ['ArrowLeft'])
  useKeyDown(() => {
    handleNext()
  }, ['ArrowRight'])

  // Not defined in configuration
  if (!inspirations) {
    return <SmileyXEyesIcon size={48} />
  }

  // Triggered when a user select a category among the configured ones
  const handleCategorySelected = (inspiration: InspirationConfig) => {
    setSelectedCategory(inspiration.name)

    // Load random notes
    const query = extractQuery(inspiration)
    console.info(`Searching for ${inspiration.name}...`)

    const search = async () => {
      const results: QueryResult = await window.api.search(query)
      console.info(`Found ${results.notes.length} note(s)...`)
      setNotes(results.notes)
    }
    search()
  }

  // Triggered when the user move between notes
  const handlePrevious = () => {
    setIndex(Math.min(index - 1, 0)) // Stay at the beginning if moving backwards
  }
  const handleNext = () => {
    setIndex((index + 1) % notes.length) // Go back to first note at the end
  }

  // The current note to display (in any)
  const note: Note | undefined = notes.length ? notes[index] : undefined

  return (
    <div className="Screen Inspiration">
      {!selectedCategory && (
        <div className="Content">
          <Question
            question="Choose a category"
            choices={inspirations}
            renderChoice={(inspiration: InspirationConfig) => inspiration.name}
            onChoiceSelected={handleCategorySelected}
          />
        </div>
      )}
      {selectedCategory && (
        <>
          <Actions>
            {notes.length > 1 && (
              <Action
                icon={<SkipBackIcon />}
                title="Previous"
                onClick={handlePrevious}
                key="previous"
              />
            )}
            {notes.length > 1 && (
              <Action icon={<SkipForwardIcon />} title="Next" onClick={handleNext} key="next" />
            )}
            <Action
              icon={<EraserIcon />}
              title="Reset"
              onClick={() => setSelectedCategory(undefined)}
              key="reset"
            />
          </Actions>
          <div className="Content">{note && <FullScreenNote note={note} />}</div>
        </>
      )}
    </div>
  )
}

export default Inspiration
