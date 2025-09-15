export function toHumanReadableDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  // Handle today, yesterday, tomorrow
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';  
  if (diffDays === -1) return 'Yesterday';
  
  // Handle future dates
  if (diffDays > 0) {
    if (diffDays <= 7) return `in ${diffDays} days`;
    if (diffWeeks === 1) return 'in a week';
    if (diffWeeks < 4) return `in ${diffWeeks} weeks`;
    if (diffMonths === 1) return 'in a month';
    if (diffMonths < 12) return `in ${diffMonths} months`;
    if (diffYears === 1) return 'in a year';
    return `in ${diffYears} years`;
  }
  
  // Handle past dates
  const absDays = Math.abs(diffDays);
  const absWeeks = Math.round(absDays / 7);
  const absMonths = Math.round(absDays / 30);
  const absYears = Math.round(absDays / 365);
  
  if (absDays <= 7) return `${absDays} days ago`;
  if (absWeeks === 1) return '1 week ago';
  if (absWeeks < 4) return `${absWeeks} weeks ago`;
  if (absMonths === 1) return '1 month ago';
  if (absMonths < 12) return `${absMonths} months ago`;
  if (absYears === 1) return '1 year ago';
  return `${absYears} years ago`;
}