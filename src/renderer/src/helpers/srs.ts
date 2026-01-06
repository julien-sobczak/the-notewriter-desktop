import { DeckConfig, Flashcard, Review } from '@renderer/Model'

export interface SRSAlgorithm {
  schedule(config: DeckConfig, card: Flashcard, review: Review): Flashcard
  interval(config: DeckConfig, card: Flashcard, review: Review): string
}

const defaultEasyFactor = 2.5 // Default easy factor for new cards graduating to learning queue

// Map feedback strings to confidence numbers (0-100)
export const feedbackToConfidence: { [key: string]: number } = {
  'too-hard': 0,
  hard: 10,
  again: 30,
  good: 60,
  easy: 80,
  'too-easy': 100
}

export class NoteWriterSRS implements SRSAlgorithm {
  // Helper function to map confidence (0-100) to feedback category
  // The thresholds are centered around the mapped confidence values to ensure
  // round-trip consistency between confidence and feedback
  private static confidenceToFeedback(confidence: number): string {
    if (confidence < 5) return 'too-hard' // [0, 5)
    if (confidence < 20) return 'hard' // [5, 20)
    if (confidence < 45) return 'again' // [20, 45)
    if (confidence < 70) return 'good' // [45, 70)
    if (confidence < 90) return 'easy' // [70, 90)
    return 'too-easy' // [90, 100]
  }

  // Update the settings based on the feedback and the current queue
  newSettings(
    config: DeckConfig,
    settings: { [name: string]: any },
    study: Review
  ): { [name: string]: any } {
    // The implementation is heavily inspired by Anki SM-2
    // See https://faqs.ankiweb.net/what-spaced-repetition-algorithm
    // The implementation is keep minimal. The core logic is preserved
    // but many parts (relapses, delay bonus) were ommitted
    // to make the algorithm understandable at a glance.

    const steps = config.algorithmSettings?.steps || ['1m', '10m', '1d'] // Default steps
    const maxStep = steps[steps.length - 1]

    const newSettings = {
      ...settings
    }
    if (!newSettings.repetitions) {
      newSettings.repetitions = 0 // Initialize repetitions if not set
      newSettings.queue = 'learning' // Default to learning queue
      newSettings.step = 0
      newSettings.easyFactor = defaultEasyFactor
      newSettings.interval = steps[0]
    }

    // Map confidence to feedback for compatibility with existing algorithm
    const feedback = NoteWriterSRS.confidenceToFeedback(study.confidence)

    switch (newSettings.queue) {
      case 'learning':
        switch (feedback) {
          case 'too-hard':
            // Restart from scratch
            newSettings.step = 0
            newSettings.easyFactor = 0
            newSettings.interval = steps[0]
            break
          case 'hard':
            // Repeat from scratch but keep the ease factor (for relapse)
            newSettings.step = 0
            newSettings.interval = steps[0]
            break
          case 'again':
            if (newSettings.step + 1 < steps.length - 1) {
              // Slightly increase the step to avoid having "hard" and "again" equal
              const step1 = Interval.parse(steps[newSettings.step])
              const step2 = Interval.parse(steps[newSettings.step + 1])
              newSettings.interval = Interval.middle(step1, step2).toString()
            }
            break
          case 'good':
            if (newSettings.step > steps.length - 1) {
              newSettings.step += 1
              newSettings.interval = steps[newSettings.step]
            } else {
              // No more steps, same as 'easy'
              newSettings.queue = 'reviewing'
              newSettings.easyFactor = newSettings.easyFactor || defaultEasyFactor
              newSettings.interval = NoteWriterSRS.nextInterval(maxStep, newSettings.easyFactor)
            }
            break
          case 'easy':
            // Graduating to reviewing queue
            newSettings.queue = 'reviewing'
            newSettings.easyFactor = newSettings.easyFactor || defaultEasyFactor
            newSettings.interval = NoteWriterSRS.nextInterval(maxStep, newSettings.easyFactor)
            break
          case 'too-easy':
            // Graduating to reviewing queue with a bonus ease factor
            newSettings.queue = 'reviewing'
            newSettings.easyFactor = (newSettings.easyFactor || defaultEasyFactor) * 1.3
            newSettings.interval = NoteWriterSRS.nextInterval(maxStep, newSettings.easyFactor)
            break
          default:
            throw new Error(`Unknown feedback type: ${feedback}`)
        }
        break
      case 'reviewing':
        switch (feedback) {
          case 'too-hard':
            // Restart again from scratch
            break
          case 'hard':
            // Restart learning again but keep a ease factor
            // to speed up the revisions when graduating to reviewing again
            newSettings.queue = 'learning'
            newSettings.easyFactor = 0.8 * (newSettings.easyFactor || defaultEasyFactor)
            newSettings.interval = steps[0]
            break
          case 'again':
            // Decrease the ease factor by 15 percentage points
            newSettings.easyFactor = (newSettings.easyFactor || defaultEasyFactor) * 0.85
            newSettings.interval = NoteWriterSRS.nextInterval(
              newSettings.interval,
              newSettings.easyFactor
            )
            break
          case 'good':
            // Continue with the same ease factor
            newSettings.interval = NoteWriterSRS.nextInterval(
              newSettings.interval,
              newSettings.easyFactor
            )
            break
          case 'easy':
            // Increase the ease factor by 15 percentage points
            newSettings.easyFactor = (newSettings.easyFactor || defaultEasyFactor) * 1.15
            newSettings.interval = NoteWriterSRS.nextInterval(
              newSettings.interval,
              newSettings.easyFactor
            )
            break
          case 'too-easy':
            // Boost the ease factor by 50 percentage points
            newSettings.easyFactor = (newSettings.easyFactor || defaultEasyFactor) * 1.5
            newSettings.interval = NoteWriterSRS.nextInterval(
              newSettings.interval,
              newSettings.easyFactor
            )
            break
          default:
            throw new Error(`Unknown feedback type: ${feedback}`)
        }
        break
      default:
        throw new Error(`Unknown queue type: ${newSettings.queue}`)
    }

    newSettings.repetitions = (newSettings.repetitions || 0) + 1

    console.log(`New settings for flashcard ${study.flashcardOID}:`, newSettings) // Debug log

    return newSettings
  }

  schedule(config: DeckConfig, card: Flashcard, study: Review): Flashcard {
    const newSettings = this.newSettings(config, card.settings, study)
    newSettings.repetitions = (newSettings.repetitions || 0) + 1

    return {
      ...card,
      dueAt: NoteWriterSRS.nextDue(newSettings.interval),
      settings: newSettings,
      studiedAt: new Date().toISOString()
    }
  }

  interval(config: DeckConfig, card: Flashcard, study: Review): string {
    const newSettings = this.newSettings(config, card.settings, study)
    return newSettings.interval
  }

  static nextInterval(interval: string, easeFactor: number): string {
    // Ex: "1d" * 2.5 => "2.5d"
    // Ex: "10m" * 2.5 => "25m"
    const i1 = Interval.parse(interval)
    return i1.multiply(easeFactor).toString()
  }

  static nextDue(interval: string): string {
    // Ex: "1d" => "2023-10-01T00:00:00.000Z"
    const i1 = Interval.parse(interval)
    const now = new Date()
    now.setMinutes(now.getMinutes() + i1.toMinutes())
    return now.toISOString()
  }
}

// Value object for time intervals like "10m", "2h", "1d"
export class Interval {
  value: number

  unit: 'm' | 'h' | 'd'

  constructor(value: number, unit: 'm' | 'h' | 'd') {
    this.value = value
    this.unit = unit
  }

  // Parse from string like "10m", "2h", "1d"
  static parse(str: string): Interval {
    const match = /^(\d+(?:\.\d+)?)([mhd])$/.exec(str.trim())
    if (!match) throw new Error(`Invalid interval string: ${str}`)
    return new Interval(Number(match[1]), match[2] as 'm' | 'h' | 'd')
  }

  // Convert to minutes
  toMinutes(): number {
    switch (this.unit) {
      case 'm':
        return this.value
      case 'h':
        return this.value * 60
      case 'd':
        return this.value * 1440
      default:
        throw new Error(`Unknown interval unit: ${this.unit}`)
    }
  }

  // Returns the middle interval between two intervals
  static middle(i1: Interval, i2: Interval): Interval {
    const min1 = i1.toMinutes()
    const min2 = i2.toMinutes()
    const avg = (min1 + min2) / 2
    return Interval.fromMinutes(avg)
  }

  // Convert from minutes to best unit
  static fromMinutes(minutes: number): Interval {
    if (minutes >= 1440) {
      // More than or equal to 1 day
      return new Interval(Math.floor(minutes / 1440), 'd')
    }
    if (minutes >= 60) {
      // More than or equal to 1 hour
      return new Interval(Math.floor(minutes / 60), 'h')
    }
    // Less than 1 hour
    return new Interval(Math.round(minutes), 'm')
  }

  // Multiply interval by a factor and round to the closest unit
  multiply(factor: number): Interval {
    const totalMinutes = this.toMinutes() * factor
    return Interval.fromMinutes(totalMinutes)
  }

  // String representation, e.g. "10m"
  toString(): string {
    return `${this.value}${this.unit}`
  }
}

// Factory function using currying to pass easily the core logic of an SRS algorithm to a React component without needing this component to know about the DeckConfig or the algorithm.
export function intervalFn(config: DeckConfig): (card: Flashcard, feedback: string) => string {
  const algorithm: SRSAlgorithm = new NoteWriterSRS()
  return (card: Flashcard, feedback: string): string => {
    const confidence = feedbackToConfidence[feedback]
    if (confidence === undefined) {
      throw new Error(`Unknown feedback type: ${feedback}`)
    }

    const review: Review = {
      flashcardOID: card.oid,
      durationInMs: 0,
      confidence,
      completedAt: '',
      dueAt: card.dueAt,
      algorithm: 'nt0',
      settings: card.settings
    }
    return algorithm.interval(config, card, review)
  }
}
