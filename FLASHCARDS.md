# Flashcards

## The NoteWriter Desktop

* After every flashcard review, append a new `Study` to a `PackFile`. The `PackFile` must not be in the `operation-graph` file.
* When periodically committing/synching the decks of a repository, the `PackFile` must be appended into `operation-graph` so that other remotes could pull it.

Therefore,

* "WAL" Packfiles can be stored directly at their definitive location (just the `database.db` is also immediately updated).

### SRS Algorithm

In `shared/srs.ts`:

```ts
export interface SRSAlgorithm {
  schedule(card: Flashcard, study: Study): Flashcard;
  interval(card: Flashcard, study: Study): number; // in minutes?
}

export class Anki2 implements SRSAlgorithm {
  schedule(card: Flashcard, study: Study): Flachcard {
    // Anki2 scheduling logic
    return {
      ...card,
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days later
    };
  }
}

export class NoteWriter1 implements SRSAlgorithm {
  schedule(card: Flashcard, study: Study): Flashcard {
    // NoteWriter1 logic (e.g., spaced by 1.5x intervals)
    return {
      ...card,
      dueAt: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000),
    };
  }
}

// Use them Interchangeably
function scheduleCard(card: Flashcard, algorithm: SRSAlgorithm): ScheduledCard {
  return algorithm.schedule(card);
}

const algo1 = new Anki2();
const algo2 = new NoteWriter1();

const result1 = scheduleCard(myCard, algo1);
const result2 = scheduleCard(myCard, algo2);
```

* Need a function to update a flashcard SRS settings after a review => `update(Flashcard, Study) -> Flashcard`
* Need a function to determine the interval for `Hard, Good, Again, Easy` => `interval(Flashcard, Study) -> interval`

## The NoteWriter Nomad

* Operations will be downloaded on the smartphone (We want to know pending reminders, and most of all, we need the last SRS setting for every flashcard).
* After every flashcard review, append a new `Study` to a `PackFile`. The logic is identifical to the NoteWriter Desktop, except the mobile application is working with its own `database.db` file.

These applications must keep the OIDs of the WAL packfiles. (Several packfiles may be required if we limit the maximum number of operations per pack file, which seems a good idea.) and know which one is the most recent.
A solution is to edit `commit-graph` but marked these pack files as `wal: true` and search for the most recent `wal: true` one to find the one to append.

⚠️ Appending a new pack object inside a pack file is not convenient. Code logic is not ideal, neither the performance. Appending a single row in a text file is more efficient (simply use `open` with the flag `APPEND`). Rotate the file after X after X MB. 
