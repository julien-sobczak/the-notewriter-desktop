import { formatDate } from '@renderer/helpers/dateUtils'
import React, { useState, useEffect } from 'react'

type TimelineRangePickerProps = {
  min: string
  max: string
  start: string
  end: string
  onChange: (start: string, end: string) => void
}

/**
 * A custom slider component for selecting a date range.
 *
 * @param min - The minimum date (inclusive) of the timeline range, as a string (e.g., "2024-01-01").
 * @param max - The maximum date (inclusive) of the timeline range, as a string.
 * @param start - The currently selected start date, as a string.
 * @param end - The currently selected end date, as a string.
 * @param onChange - Callback invoked when the user releases either slider handle, providing the new start and end dates as strings.
 */
function TimelineRangePicker({ min, max, start, end, onChange }: TimelineRangePickerProps) {
  // Convert dates to numeric values for slider
  const minDate = new Date(min).getTime()
  const maxDate = new Date(max).getTime()
  const startDate = new Date(start).getTime()
  const endDate = new Date(end).getTime()

  // State for temporary values during dragging
  const [tempStart, setTempStart] = useState(startDate)
  const [tempEnd, setTempEnd] = useState(endDate)

  // Update temp values when props change
  useEffect(() => {
    setTempStart(startDate)
    setTempEnd(endDate)
  }, [startDate, endDate])

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseInt(e.target.value, 10)
    if (newStart <= tempEnd) {
      setTempStart(newStart)
    }
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseInt(e.target.value, 10)
    if (newEnd >= tempStart) {
      setTempEnd(newEnd)
    }
  }

  const handleStartRelease = () => {
    const newStartDate = formatDate(new Date(tempStart))
    const newEndDate = formatDate(new Date(tempEnd))
    onChange(newStartDate, newEndDate)
  }

  const handleEndRelease = () => {
    const newStartDate = formatDate(new Date(tempStart))
    const newEndDate = formatDate(new Date(tempEnd))
    onChange(newStartDate, newEndDate)
  }

  // Calculate percentages for styling
  const startPercent = ((tempStart - minDate) / (maxDate - minDate)) * 100
  const endPercent = ((tempEnd - minDate) / (maxDate - minDate)) * 100

  // The HTML input[type="range"] element only support a single thumb.
  // We need to have two thumbs to select a range.
  // The current implementation uses two overlapping range inputs.
  // These inputs are transparent and positioned on top of each other.
  // An additiona <div> element is used to visually represent the selected range between the two thumbs.
  return (
    <div className="TimelineRangePicker">
      <div className="TimelineRangePicker-labels">
        <span className="TimelineRangePicker-label">
          From: <strong>{formatDate(new Date(tempStart))}</strong>
        </span>
        <span className="TimelineRangePicker-label">
          To: <strong>{formatDate(new Date(tempEnd))}</strong>
        </span>
      </div>
      <div className="TimelineRangePicker-slider">
        <div className="TimelineRangePicker-track">
          <div
            className="TimelineRangePicker-range"
            style={{
              left: `${startPercent}%`,
              right: `${100 - endPercent}%`
            }}
          />
        </div>
        <input
          type="range"
          className="TimelineRangePicker-input TimelineRangePicker-input--start"
          min={minDate}
          max={maxDate}
          value={tempStart}
          onChange={handleStartChange}
          onMouseUp={handleStartRelease}
          onTouchEnd={handleStartRelease}
        />
        <input
          type="range"
          className="TimelineRangePicker-input TimelineRangePicker-input--end"
          min={minDate}
          max={maxDate}
          value={tempEnd}
          onChange={handleEndChange}
          onMouseUp={handleEndRelease}
          onTouchEnd={handleEndRelease}
        />
      </div>
    </div>
  )
}

export default TimelineRangePicker
