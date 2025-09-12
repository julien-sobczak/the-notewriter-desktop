import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Clock, Calendar, X } from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import HoveredNote from './HoveredNote';
import { Reminder, Memory, Note, NoteRef } from '../shared/Model';

interface RemindersAndMemoriesPopupProps {
  reminders: Reminder[];
  memories: Memory[];
  onClose: () => void;
  onItemClick: (noteRef: NoteRef) => void;
}

function RemindersAndMemoriesPopup({
  reminders,
  memories,
  onClose,
  onItemClick,
}: RemindersAndMemoriesPopupProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Now';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return date.toLocaleDateString();
  };

  const formatMemoryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffYears > 0)
      return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return 'Today';
  };

  return (
    <div className="RemindersMemoriesPopup">
      <div className="PopupHeader">
        <h2>Reminders & Memories</h2>
        <button type="button" onClick={onClose} className="CloseButton">
          <X size={16} />
        </button>
      </div>

      <div className="PopupContent">
        {reminders.length > 0 && (
          <div className="RemindersSection">
            <h3>
              <Clock size={16} /> Reminders
            </h3>
            <div className="ItemsList">
              {reminders.map((reminder) => (
                <div
                  key={reminder.oid}
                  className="ReminderItem"
                  onClick={() =>
                    onItemClick({
                      oid: reminder.noteOid,
                      repositorySlug: reminder.repositorySlug,
                    })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onItemClick({
                        oid: reminder.noteOid,
                        repositorySlug: reminder.repositorySlug,
                      });
                    }
                  }}
                >
                  <div className="ItemTime">
                    {formatDate(reminder.nextPerformedAt)}
                  </div>
                  <div className="ItemContent">
                    <div className="ItemDescription">
                      {reminder.description}
                    </div>
                    <div className="ItemPath">{reminder.relativePath}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {memories.length > 0 && (
          <div className="MemoriesSection">
            <h3>
              <Calendar size={16} /> Memories
            </h3>
            <div className="ItemsList">
              {memories.map((memory) => (
                <div
                  key={memory.oid}
                  className="MemoryItem"
                  onClick={() =>
                    onItemClick({
                      oid: memory.noteOid,
                      repositorySlug: memory.repositorySlug,
                    })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onItemClick({
                        oid: memory.noteOid,
                        repositorySlug: memory.repositorySlug,
                      });
                    }
                  }}
                >
                  <div className="ItemTime">
                    {formatMemoryDate(memory.occurredAt)}
                  </div>
                  <div className="ItemContent">
                    <div className="ItemText">{memory.text}</div>
                    <div className="ItemPath">{memory.relativePath}</div>
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
      </div>
    </div>
  );
}

function Reminders() {
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
      const result = await window.electron.getRemindersAndMemories(
        selectedRepositorySlugs,
      );
      setReminders(result.reminders);
      setMemories(result.memories);
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

  const handleItemClick = async (noteRef: NoteRef) => {
    try {
      const note = await window.electron.find(noteRef);
      setHoveredNote(note);
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  const totalCount = reminders.length + memories.length;
  const hasPendingReminders = reminders.some((reminder) => {
    const nextDate = new Date(reminder.nextPerformedAt);
    const now = new Date();
    return nextDate <= now;
  });

  return (
    <div className="Reminders">
      {/* Count display for the left menu */}
      <div
        className={`RemindersCount ${hasPendingReminders ? 'urgent' : ''}`}
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
        {loading ? '...' : totalCount}
      </div>

      {/* Popup */}
      {showPopup && (
        <RemindersAndMemoriesPopup
          reminders={reminders}
          memories={memories}
          onClose={() => setShowPopup(false)}
          onItemClick={handleItemClick}
        />
      )}

      {/* Hovered note */}
      {hoveredNote && (
        <HoveredNote note={hoveredNote} onClose={() => setHoveredNote(null)} />
      )}
    </div>
  );
}

export default Reminders;
