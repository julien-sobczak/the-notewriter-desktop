/* Config */

/* Static Config */
/* editorconfig.yml */

// TODO use repositorySlugs instead of repositories to be consistent

export interface EditorStaticConfig {
  repositories: RepositoryRefConfig[];
  dailyQuote?: DailyQuoteConfig;
  inspirations?: InspirationConfig[];
  zenMode?: ZenConfig;
  planner?: PlannerConfig;
  journal?: JournalConfig[];
}

export interface RepositoryRefConfig {
  name: string;
  slug: string;
  path: string;
  selected?: boolean;
}

export interface DailyQuoteConfig {
  query: string;
  repositories: string[];
}

export interface InspirationConfig {
  name: string;
  repositories: string[];
  query: string;
}

export interface ZenConfig {
  queries: ZenQuery[];
}

export interface ZenQuery {
  query: string;
  repositories?: string[];
}

export interface PlannerConfig {
  projects?: PlannerQueryConfig[];
  tasks?: PlannerQueryConfig[];
}

export interface PlannerQueryConfig {
  name: string;
  query: string;
  repositories: string[];
}

export interface JournalConfig {
  name: string;
  repository: string;
  path: string;
  defaultContent?: string;
  routines: RoutineConfig[];
}

export interface RoutineConfig {
  name: string;
  template: string;
}

/* Dynamic Config */
/* editorconfig.json */

export interface EditorDynamicConfig {
  bookmarks?: Bookmark[];
  desks?: Desk[];
}

export interface Bookmark {
  // Identify the note
  repositorySlug: string;
  noteOID: string;
  // Copy some attributes to make easy to list favorites and jump to them
  noteType: string;
  noteLongTitle: string;
  noteRelativePath: string;
  noteLine: number;
}

export interface Desk {
  id: string;
  // Name of the desk
  name: string;
  // Layout
  root: Block;
}

export interface Block {
  // Unique identifier inside a single desk
  id: string;
  name: string | null;
  layout: string; // container | horizontal | vertical
  repositories: string[]; // Repositories to use by default on queries (recursively)
  view: string | null; // single | grid | list | free
  // Percentage of this block on parent size (height for vertical, width for horizontal)
  size: string | null;

  // Layout-specific attributes

  // for horizontal/vertical blocks
  elements: Block[] | null;

  // for container blocks
  query: string | null;
  noteRefs: NoteRef[];
}

/* The NoteWriter Config */
/* .nt/.config.json */

export interface RepositoryConfig {
  core: CoreConfig | null;
  attributes: { [key: string]: AttributeConfig };
  types: { [key: string]: TypeConfig };
  decks: DeckConfig[];
  searches: { [key: string]: SearchConfig };
  // Ignore linter and references sections
}
export interface CoreConfig {
  extensions: string[];
  // Ignore media section
}
export interface AttributeConfig {
  name: string;
  aliases: string[];
  type: string;
  format: string;
  min: number;
  max: number;
  pattern: string;
  inherit: boolean | null;
  allowedValues: string[];
  shorthands: { [key: string]: any };
  preserveShorthand?: boolean;
  defaultValue?: any;
}
export interface TypeConfig {
  name: string;
  pattern: string;
  preprocessors: string[];
  attributes: TypeAttributeConfig[];
}
export interface TypeAttributeConfig {
  name: string;
  required?: boolean;
  inline?: boolean;
}
export interface DeckConfig {
  name: string;
  query: string;
  boostFactor: number;
  newFlashcardsPerDay: number;
  maxFlashcardsPerDay: number;
  algorithm: string;
  algorithmSettings: { [key: string]: any };
}
export interface SearchConfig {
  title: string;
  q: string;
}

/* API */

export interface Deck {
  repositorySlug: string;
  name: string;
  config: DeckConfig;
  stats: StatsDeck;
}
export interface StatsDeck {
  due: number;
  new: number;
}
export interface DeckRef {
  repositorySlug: string;
  name: string;
}

/* UI Model */

export interface NoteRef {
  oid: string;
  repositorySlug: string;
}

export interface Statistics {
  // Count of notes according the nationality of the author
  countNotesPerNationality: Map<string, number>;

  // Count of notes by type
  countNotesPerType: Map<string, number>;
}

export interface Query {
  // The raw query string
  q: string;
  // The selected repositories
  repositories: string[];
  // The desk where the query originated
  deskId: string | null | undefined;
  // The block where the query originated
  blockId: string | null | undefined;
  limit: number; // Use 0 to not limit
  shuffle: boolean;
}

export interface QueryResult {
  query: Query;
  notes: Note[];
}

/* DB Model */

export interface Blob {
  oid: string;
  mimeType: string;
  attributes: { [name: string]: any };
  tags: string[];
}

export interface Media {
  oid: string;
  relativePath: string;
  kind: string;
  extension: string;
  blobs: Blob[];
}

export interface Note {
  oid: string;
  // File containing the note
  oidFile: string;

  slug: string;

  // Enriched information about the repository where the note comes from
  repositorySlug: string;
  repositoryPath: string;

  // Type of note: free, reference, ...
  type: string;

  // Titles in Markdown
  title: string;
  longTitle: string;
  shortTitle: string;

  // The relative path of the file containing the note (denormalized field)
  relativePath: string;
  // The full wikilink to this note
  wikilink: string;

  // Attributes
  attributes: { [name: string]: any };
  // Tags
  tags: string[];

  // Line number (1-based index) of the note section title
  line: number;

  // Content (Markdown)
  content: string;
  // Body of the note, without the title and block attributes
  body: string;
  // Comment (Markdown)
  comment: string;

  // Optional items (for list notes)
  items?: Items;

  marked: boolean;
  annotations: Annotation[];

  // Medias/Blobs referenced by the note
  medias: Media[];
}

export interface Items {
  children: ListItem[];
  attributes: string[];
  tags: string[];
  emojis: string[];
}

export interface ListItem {
  line: number;
  text: string;
  attributes: { [name: string]: any };
  tags: string[];
  emojis: string[];
  children?: ListItem[];
}

export interface Annotation {
  oid: string;
  text: string;
}

export interface Flashcard {
  // Flashcards are related to their note and many attributes or properties on the note
  // are interesting when working with a flashcard. (ex: the note line to edit)

  oid: string;
  oidFile: string;
  oidNote: string;

  // Note-specific attributes
  relativePath: string;
  shortTitle: string;
  tags: string[];
  attributes: { [name: string]: string };

  // Content in Markdown
  front: string;
  back: string;

  // SRS
  dueAt: string; // ISO Format (TODO use type Date instead?), empty if never studied
  studiedAt: string; // ISO Format (TODO use type Date instead?), empty if never studied
  settings: { [name: string]: any };
}

export interface Reminder {
  oid: string;
  fileOid: string;
  noteOid: string;

  // Enriched information about the repository where the note comes from
  repositorySlug: string;
  repositoryPath: string;

  // The relative path of the file containing the note (denormalized field)
  relativePath: string;

  // Description
  description: string;

  // Tag value containing the formula to determine the next occurrence
  tag: string;

  // Timestamps to track progress
  lastPerformedAt?: string;
  nextPerformedAt: string;
}

export interface Memory {
  oid: string;
  noteOid: string;

  // Enriched information about the repository where the note comes from
  repositorySlug: string;
  repositoryPath: string;

  // The relative path of the file containing the note (denormalized field)
  relativePath: string;

  text: string;
  occurredAt: string;
}

/**
 * Determines the next reminder date based on the reminder tag and last performed date.
 * Supports various tag patterns for different recurrence types.
 */
export function determineNextReminder(
  reminder: Reminder,
  lastPerformedAt: Date,
): Date {
  const tag = reminder.tag;
  const referenceDate = lastPerformedAt;

  // Parse static date: #reminder-2023-02-01
  const staticDateMatch = tag.match(/^#reminder-(\d{4})-(\d{2})-(\d{2})$/);
  if (staticDateMatch) {
    const [, year, month, day] = staticDateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Parse yearly recurrence: #reminder-every-${year}-02-01
  const yearlyMatch = tag.match(/^#reminder-every-\$\{year\}-(\d{2})-(\d{2})$/);
  if (yearlyMatch) {
    const [, month, day] = yearlyMatch;
    const nextYear = referenceDate.getFullYear() + 1;
    return new Date(nextYear, parseInt(month) - 1, parseInt(day));
  }

  // Parse even year: #reminder-${even-year}-02-01
  const evenYearMatch = tag.match(
    /^#reminder-\$\{even-year\}-(\d{2})-(\d{2})$/,
  );
  if (evenYearMatch) {
    const [, month, day] = evenYearMatch;
    let nextYear = referenceDate.getFullYear();
    if (nextYear % 2 !== 0)
      nextYear++; // Make it even
    else nextYear += 2; // Next even year
    return new Date(nextYear, parseInt(month) - 1, parseInt(day));
  }

  // Parse odd year: #reminder-${odd-year}-02-01
  const oddYearMatch = tag.match(/^#reminder-\$\{odd-year\}-(\d{2})-(\d{2})$/);
  if (oddYearMatch) {
    const [, month, day] = oddYearMatch;
    let nextYear = referenceDate.getFullYear();
    if (nextYear % 2 === 0)
      nextYear++; // Make it odd
    else nextYear += 2; // Next odd year
    return new Date(nextYear, parseInt(month) - 1, parseInt(day));
  }

  // Parse monthly recurrence in specific year: #reminder-every-2025-${month}-02
  const monthlyInYearMatch = tag.match(
    /^#reminder-every-(\d{4})-\$\{month\}-(\d{2})$/,
  );
  if (monthlyInYearMatch) {
    const [, year, day] = monthlyInYearMatch;
    const nextMonth = referenceDate.getMonth() + 1;
    if (nextMonth > 11) {
      // Move to next year if we've gone through all months
      return new Date(parseInt(year) + 1, 0, parseInt(day));
    }
    return new Date(parseInt(year), nextMonth, parseInt(day));
  }

  // Parse odd months in specific year: #reminder-every-2025-${odd-month}
  const oddMonthMatch = tag.match(/^#reminder-every-(\d{4})-\$\{odd-month\}$/);
  if (oddMonthMatch) {
    const [, year] = oddMonthMatch;
    const currentMonth = referenceDate.getMonth();
    let nextOddMonth = currentMonth + 1;

    // Find next odd month (0-indexed, so odd months are 1, 3, 5, 7, 9, 11)
    while (nextOddMonth <= 11 && nextOddMonth % 2 === 0) {
      nextOddMonth++;
    }

    if (nextOddMonth > 11) {
      // Move to next year, first odd month
      return new Date(parseInt(year) + 1, 1, 2); // February 2nd
    }
    return new Date(parseInt(year), nextOddMonth, 2);
  }

  // Parse daily recurrence: #reminder-every-${day}
  const dailyMatch = tag.match(/^#reminder-every-\$\{day\}$/);
  if (dailyMatch) {
    const nextDay = new Date(referenceDate.getTime());
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }

  // Parse weekday recurrence: #reminder-every-${tuesday}
  const weekdayMatch = tag.match(/^#reminder-every-\$\{(\w+)\}$/);
  if (weekdayMatch) {
    const [, weekdayName] = weekdayMatch;
    const weekdays = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const targetDay = weekdays.indexOf(weekdayName.toLowerCase());

    if (targetDay === -1) {
      throw new Error(`Invalid weekday: ${weekdayName}`);
    }

    const nextDate = new Date(referenceDate.getTime());
    const currentDay = nextDate.getDay();
    const daysToAdd = (targetDay - currentDay + 7) % 7 || 7; // Always add at least 1 week
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate;
  }

  // Default: return the original nextPerformedAt if we can't parse the tag
  return new Date(reminder.nextPerformedAt);
}

export interface Relation {
  sourceOID: string;
  sourceKind: string;
  targetOID: string;
  targetKind: string;
  relationType: string;
}

export interface File {
  oid: string;
  slug: string;

  repositorySlug: string;
  repositoryPath: string;

  relativePath: string;
  wikilink: string;
  // Titles in Markdown
  title: string;
  shortTitle: string;
}

export interface Goto {
  oid: string;
  oidNote: string;
  relativePath: string;
  text: string; // in Markdown
  url: string;
  title?: string; // Optional title for the link
  name: string;
}

export interface Study {
  // TODO still useful?
  oid: string;
  startedAt: string;
  endedAt: string;
  reviews: Review[];
}

export interface Review {
  // TODO update?
  flashcardOID: string;
  feedback: string; // easy | good | again | hard | too-easy | too-hard
  durationInMs: number;
  completedAt: string;
  dueAt: string;
  settings: { [key: string]: any };
}

export interface PackFileRef {
  oid: string;
  ctime: string;
}
export interface PackFile {
  oid: string;
  file_mtime: string;
  file_size: number;
  ctime: string;
  objects: PackObject[];
  blobs: Blob[];
}
export interface PackObject {
  oid: string;
  kind: string;
  ctime: string;
  description: string;
  data: string;
}

export interface Operation {
  oid: string;
  object_oid: string;
  name: string;
  timestamp: string; // ISO format
  extras: { [key: string]: any };
}

export interface CommandExecution {
  exitCode: number;
  duration: number; // in milliseconds
  stdout: string;
  stderr: string;
}

/* Utils */

// Get the attribute for a given name in the repository configuration
export function getAttributeConfig(
  repositoryConfig: RepositoryConfig,
  name: string,
): AttributeConfig {
  const attr = repositoryConfig?.attributes?.[name] ?? {
    name,
    aliases: [],
    type: 'string', // Default to string
    format: '',
    min: 0,
    max: 0,
    pattern: '',
    inherit: null, // Default to no inheritance
  };
  return attr;
}

// Extract the source link from a note attributes
export function extractSourceURL(note: Note): string | undefined {
  // Search in attributes for a `source` attribute containing an HTTP(s) URL and return it.
  // Ex: https://example.com/resource must be returned as a string.
  // Ex: [Alt](https://example.com/resource "Title") must return only the URL.
  for (const [key, value] of Object.entries(note.attributes)) {
    if (key === 'source' && typeof value === 'string') {
      // Extract the first HTTP(S) URL from the string
      const match = value.match(/https?:\/\/[^\s)"]+/);
      if (match) {
        return match[0];
      }
    }
  }
  return undefined;
}
