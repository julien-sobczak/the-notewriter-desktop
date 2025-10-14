import { useState, useEffect } from 'react'
import { Note } from '@renderer/Model'
import FullScreenNote from './FullScreenNote'
import useKeyDown from '@renderer/helpers/useKeyDown'

function DailyQuote({ onClose }: any) {
  const [dailyQuote, setDailyQuote] = useState<Note | undefined>(undefined)

  useEffect(() => {
    // Retrieve a random quote
    const getDailyQuote = async () => {
      if (!window.electron) return
      const note = await window.api.getDailyQuote()
      setDailyQuote(note)
    }
    getDailyQuote()
  }, [])

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
