import React from 'react';

type TimelineRangePickerProps = {
  min: string;
  max: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
};

/**
 * A component for selecting a date range using two date inputs.
 * The component ensures that the start date is before the end date.
 */
function TimelineRangePicker({
  min,
  max,
  start,
  end,
  onChange,
}: TimelineRangePickerProps) {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    if (newStart <= end) {
      onChange(newStart, end);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    if (newEnd >= start) {
      onChange(start, newEnd);
    }
  };

  return (
    <div className="TimelineRangePicker">
      <label htmlFor="timeline-start">
        From:
        <input
          id="timeline-start"
          type="date"
          value={start}
          min={min}
          max={max}
          onChange={handleStartChange}
        />
      </label>
      <label htmlFor="timeline-end">
        To:
        <input
          id="timeline-end"
          type="date"
          value={end}
          min={min}
          max={max}
          onChange={handleEndChange}
        />
      </label>
    </div>
  );
}

export default TimelineRangePicker;
