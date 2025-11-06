import { useEffect, useState, useContext, useCallback, useMemo } from 'react'
import {
  ClockIcon as ClockIcon,
  CalendarIcon as CalendarIcon,
  CalendarPlusIcon as CalendarPlusIcon,
  XIcon as CloseIcon,
  BellSlashIcon as SilenceIcon,
  CheckCircleIcon as CompleteIcon,
  BellIcon as NotificationIcon,
  BellRingingIcon as NotificationUrgentIcon
} from '@phosphor-icons/react'
import HoveredNote from './HoveredNote'
import { Actions, Action } from './Actions'
import { Reminder, Memory, Note, NoteRef } from '@renderer/Model'
import Markdown from './Markdown'
import { toHumanReadableDate } from '@renderer/helpers/dateUtils'
import { ConfigContext } from '@renderer/ConfigContext'

interface NotificationPopupProps {
  reminders: Reminder[]
  memories: Memory[]
  onClose: () => void
}

function NotificationsPopup({ reminders, memories, onClose }: NotificationPopupProps) {
  const [hoveredNote, setHoveredNote] = useState<Note | null>(null)

  const handleNoteClick = async (noteRef: NoteRef) => {
    try {
      const note = await window.api.find(noteRef)
      setHoveredNote(note)
    } catch (error) {
      console.error('Error loading note:', error)
    }
  }

  const handleSilenceAllReminders = async () => {
    try {
      const reminderOids = reminders.map((r) => r.oid)
      await window.api.completeReminders(reminderOids)
    } catch (error) {
      console.error('Error silencing reminders:', error)
    }
  }

  const handleCompleteReminder = async (reminderOid: string) => {
    try {
      await window.api.completeReminders([reminderOid])
    } catch (error) {
      console.error('Error completing reminder:', error)
    }
  }

  const handleAddToCalendar = (reminder: Reminder) => {
    try {
      // Format the date for Google Calendar (YYYYMMDD format for all-day events)
      const reminderDate = new Date(reminder.nextPerformedAt)
      const now = new Date()

      // Compare dates without time component
      const reminderDateOnly = new Date(
        reminderDate.getFullYear(),
        reminderDate.getMonth(),
        reminderDate.getDate()
      )
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // If the date is in the past, use tomorrow
      let eventDate: Date
      if (reminderDateOnly < nowDateOnly) {
        eventDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      } else {
        eventDate = reminderDate
      }

      // Format as YYYYMMDD
      const year = eventDate.getFullYear()
      const month = String(eventDate.getMonth() + 1).padStart(2, '0')
      const day = String(eventDate.getDate()).padStart(2, '0')
      const formattedDate = `${year}${month}${day}`

      // Create event description
      const description = `See note present in file ${reminder.relativePath} in repository ${reminder.repositorySlug}.`

      // Build Google Calendar URL
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: reminder.description,
        dates: `${formattedDate}/${formattedDate}`,
        details: description
      })

      const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`
      window.api.browseUrl(calendarUrl)
    } catch (error) {
      console.error('Error creating calendar event:', error)
    }
  }

  return (
    <div className="NotificationsPopup">
      <header>
        <Actions>
          <Action
            icon={<SilenceIcon />}
            title="Silence all reminders"
            onClick={handleSilenceAllReminders}
          />
          <Action icon={<CloseIcon />} title="Close" onClick={onClose} />
        </Actions>
      </header>
      <section className="NotificationsList">
        {reminders.length > 0 && (
          <div className="NotificationsCategory">
            <h3>
              <ClockIcon />
            </h3>
            <ul>
              {reminders.map((reminder) => (
                <li key={reminder.oid}>
                  <div className="NotificationTimestamp">
                    {toHumanReadableDate(reminder.nextPerformedAt)}
                  </div>
                  <div
                    className="NotificationDescription"
                    onClick={() =>
                      handleNoteClick({
                        repositorySlug: reminder.repositorySlug,
                        oid: reminder.noteOid
                      })
                    }
                  >
                    <Markdown md={reminder.description} inline />
                  </div>
                  <Actions>
                    <Action
                      icon={<CalendarPlusIcon />}
                      title="Add event in calendar"
                      onClick={() => handleAddToCalendar(reminder)}
                    />
                    <Action
                      icon={<CompleteIcon />}
                      title="Complete reminder"
                      onClick={() => handleCompleteReminder(reminder.oid)}
                    />
                  </Actions>
                </li>
              ))}
            </ul>
          </div>
        )}
        {memories.length > 0 && (
          <div className="NotificationsCategory">
            <h3>
              <CalendarIcon />
            </h3>
            <ul>
              {memories.map((memory) => (
                <li key={memory.oid}>
                  <div className="NotificationTimestamp">
                    {toHumanReadableDate(memory.occurredAt)}
                  </div>
                  <div
                    className="NotificationDescription"
                    onClick={() =>
                      handleNoteClick({
                        repositorySlug: memory.repositorySlug,
                        oid: memory.noteOid
                      })
                    }
                  >
                    <Markdown md={memory.text} inline />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reminders.length === 0 && memories.length === 0 && (
          <div className="NoNotifications">
            <p>No reminders or memories found.</p>
          </div>
        )}
      </section>

      {/* Hovered note */}
      {hoveredNote && <HoveredNote note={hoveredNote} onClose={() => setHoveredNote(null)} />}
    </div>
  )
}

function NotificationsStatus() {
  const { config } = useContext(ConfigContext)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)

  const staticConfig = config.static
  const selectedRepositorySlugs = useMemo(
    () =>
      staticConfig.repositories
        .filter((repository) => repository.selected)
        .map((repository) => repository.slug),
    [staticConfig.repositories] // Only recreate when repositories change
  )

  const loadRemindersAndMemories = useCallback(async () => {
    if (selectedRepositorySlugs.length === 0) {
      setReminders([])
      setMemories([])
      return
    }

    setLoading(true)
    try {
      const [remindersResult, memoriesResult] = await Promise.all([
        window.api.getPendingReminders(selectedRepositorySlugs),
        window.api.getPastMemories(selectedRepositorySlugs)
      ])
      console.log(
        `Loaded ${remindersResult.length} reminders and ${memoriesResult.length} memories`
      )
      setReminders(remindersResult)
      setMemories(memoriesResult)
    } catch (error) {
      console.error('Error loading reminders and memories:', error)
      setReminders([])
      setMemories([])
    } finally {
      setLoading(false)
    }
  }, [selectedRepositorySlugs])

  useEffect(() => {
    loadRemindersAndMemories()
  }, [loadRemindersAndMemories])

  const handleCountClick = () => {
    setShowPopup(true)
  }

  const totalCount = reminders.length + memories.length
  const hasPastReminders = reminders.some((reminder) => {
    const nextDate = new Date(reminder.nextPerformedAt)
    const now = new Date()
    return nextDate < now
  })

  const Icon = hasPastReminders ? NotificationUrgentIcon : NotificationIcon

  return (
    <div className="NotificationsStatus">
      {/* Count display for the top bar */}
      <button
        type="button"
        className={`NotificationsCount ${hasPastReminders ? 'urgent' : ''}`}
        onClick={() => {
          handleCountClick()
        }}
        title={`${reminders.length} reminders, ${memories.length} memories`}
      >
        <Icon />
        {loading ? '...' : <small>{totalCount}</small>}
      </button>

      {/* Popup */}
      {showPopup && (
        <NotificationsPopup
          reminders={reminders}
          memories={memories}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  )
}

export default NotificationsStatus
