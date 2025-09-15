import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Clock, Calendar, X, BellSlash, CheckCircle, Bell, BellRinging } from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import HoveredNote from './HoveredNote';
import { Actions, Action, Subaction } from './Actions';
import { Reminder, Memory, Note, NoteRef } from '../shared/Model';
import { toHumanReadableDate } from './dateUtils';

interface NotificationPopupProps {
  reminders: Reminder[];
  memories: Memory[];
  onClose: () => void;
  onNoteClick: (noteRef: NoteRef) => void;
  onSilenceAllReminders: () => void;
  onCompleteReminder: (reminderOid: string) => void;
}

function NotificationsPopup({
  reminders,
  memories,
  onClose,
  onNoteClick,
  onSilenceAllReminders,
  onCompleteReminder,
}: NotificationPopupProps) {

  return (
    <div className="NotificationsPopup">
      <header>
        <Actions>
          <Action
            icon={<BellSlash />}
            title="Silence all reminders"
            onClick={onSilenceAllReminders}
          />
        </Actions>
        <button type="button" onClick={onClose} className="CloseButton">
          <X />
        </button>
      </header>

      <section>
        {reminders.length > 0 && (
          <div className="RemindersSection">
            <h3>
              <Clock /> Reminders
            </h3>
            <div className="ItemsList">
              {reminders.map((reminder) => (
                <div key={reminder.oid} className="ReminderItem">
                  <div className="ItemTime">
                    {toHumanReadableDate(reminder.nextPerformedAt)}
                  </div>
                  <div className="ItemContent">
                    <div
                      className="ItemDescription"
                      onClick={() =>
                        onNoteClick({
                          oid: reminder.noteOid,
                          repositorySlug: reminder.repositorySlug,
                        })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onNoteClick({
                            oid: reminder.noteOid,
                            repositorySlug: reminder.repositorySlug,
                          });
                        }
                      }}
                    >
                      {reminder.description}
                    </div>
                  </div>
                  <Action
                    icon={<CheckCircle />}
                    title="Complete reminder"
                    onClick={() => onCompleteReminder(reminder.oid)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {memories.length > 0 && (
          <div className="MemoriesSection">
            <h3>
              <Calendar /> Memories
            </h3>
            <div className="ItemsList">
              {memories.map((memory) => (
                <div
                  key={memory.oid}
                  className="MemoryItem"
                  onClick={() =>
                    onNoteClick({
                      oid: memory.noteOid,
                      repositorySlug: memory.repositorySlug,
                    })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onNoteClick({
                        oid: memory.noteOid,
                        repositorySlug: memory.repositorySlug,
                      });
                    }
                  }}
                >
                  <div className="ItemTime">
                    {toHumanReadableDate(memory.occurredAt)}
                  </div>
                  <div className="ItemContent">
                    <div className="ItemText">{memory.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reminders.length === 0 && memories.length === 0 && (
          <div className="EmptyState">
            <p>No reminders or memories found.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Notifications() {
  const { config } = useContext(ConfigContext);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [hoveredNote, setHoveredNote] = useState<Note | null>(null);

  const staticConfig = config.static;
  const selectedRepositorySlugs = staticConfig.repositories
    .filter((repository) => repository.selected)
    .map((repository) => repository.slug);

  const loadRemindersAndMemories = useCallback(async () => {
    if (selectedRepositorySlugs.length === 0) {
      setReminders([]);
      setMemories([]);
      return;
    }

    setLoading(true);
    try {
      const [remindersResult, memoriesResult] = await Promise.all([
        window.electron.getPendingReminders(selectedRepositorySlugs),
        window.electron.getPastMemories(selectedRepositorySlugs),
      ]);
      setReminders(remindersResult);
      setMemories(memoriesResult);
    } catch (error) {
      console.error('Error loading reminders and memories:', error);
      setReminders([]);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRepositorySlugs]);

  useEffect(() => {
    loadRemindersAndMemories();
  }, [loadRemindersAndMemories]);

  const handleCountClick = () => {
    setShowPopup(true);
  };

  const handleNoteClick = async (noteRef: NoteRef) => {
    try {
      const note = await window.electron.find(noteRef);
      setHoveredNote(note);
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  const handleSilenceAllReminders = async () => {
    try {
      const reminderOids = reminders.map((r) => r.oid);
      await window.electron.completeReminders(reminderOids);
      await loadRemindersAndMemories(); // Reload data
    } catch (error) {
      console.error('Error silencing reminders:', error);
    }
  };

  const handleCompleteReminder = async (reminderOid: string) => {
    try {
      await window.electron.completeReminders([reminderOid]);
      await loadRemindersAndMemories(); // Reload data
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const totalCount = reminders.length + memories.length;
  const hasPastReminders = reminders.some((reminder) => {
    const nextDate = new Date(reminder.nextPerformedAt);
    const now = new Date();
    return nextDate < now;
  });

  const BellIcon = hasPastReminders ? BellRinging : Bell;

  return (
    <div className="NotificationsStatus">
      {/* Count display for the top bar */}
      <div
        className={`NotificationsCount ${hasPastReminders ? 'urgent' : ''}`}
        onClick={handleCountClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCountClick();
          }
        }}
        title={`${reminders.length} reminders, ${memories.length} memories`}
      >
        <BellIcon />
        {loading ? '...' : totalCount}
      </div>

      {/* Popup */}
      {showPopup && (
        <NotificationsPopup
          reminders={reminders}
          memories={memories}
          onClose={() => setShowPopup(false)}
          onNoteClick={handleNoteClick}
          onSilenceAllReminders={handleSilenceAllReminders}
          onCompleteReminder={handleCompleteReminder}
        />
      )}

      {/* Hovered note */}
      {hoveredNote && (
        <HoveredNote note={hoveredNote} onClose={() => setHoveredNote(null)} />
      )}
    </div>
  );
}

export default Notifications;