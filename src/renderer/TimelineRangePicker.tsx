import React, { useState, useEffect } from 'react';

type TimelineRangePickerProps = {
  min: string;
  max: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
};

/**
 * A modern slider component for selecting a date range.
 * Uses a dual-handle range slider with visual feedback.
 */
function TimelineRangePicker({
  min,
  max,
  start,
  end,
  onChange,
}: TimelineRangePickerProps) {
  // Convert dates to numeric values for slider
  const minDate = new Date(min).getTime();
  const maxDate = new Date(max).getTime();
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();

  // State for temporary values during dragging
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  // Update temp values when props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseInt(e.target.value, 10);
    if (newStart <= tempEnd) {
      setTempStart(newStart);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseInt(e.target.value, 10);
    if (newEnd >= tempStart) {
      setTempEnd(newEnd);
    }
  };

  const handleStartRelease = () => {
    const newStartDate = formatDate(new Date(tempStart));
    const newEndDate = formatDate(new Date(tempEnd));
    onChange(newStartDate, newEndDate);
  };

  const handleEndRelease = () => {
    const newStartDate = formatDate(new Date(tempStart));
    const newEndDate = formatDate(new Date(tempEnd));
    onChange(newStartDate, newEndDate);
  };

  // Calculate percentages for styling
  const startPercent = ((tempStart - minDate) / (maxDate - minDate)) * 100;
  const endPercent = ((tempEnd - minDate) / (maxDate - minDate)) * 100;

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
              right: `${100 - endPercent}%`,
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
  );
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default TimelineRangePicker;
