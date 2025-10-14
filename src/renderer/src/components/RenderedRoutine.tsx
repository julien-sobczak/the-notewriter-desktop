import { useRef, useState, useCallback, useEffect } from 'react'
import { FloppyDiskIcon as SaveIcon } from '@phosphor-icons/react'
import { JournalConfig, RoutineConfig, Note, ListItem } from '@renderer/Model'
import Markdown from './Markdown'
import { evaluateTemplateVariables } from '@renderer/helpers/strings'

// Generate a unique input ID
function generateInputId(): string {
  // Id must have to be unique. We don't really care about the predictability of their values.
  return `input-${Math.random().toString(36).substring(2, 9)}`
}

interface TagAttributes {
  [key: string]: string
}

/**
 * Base class for custom tag processors.
 *
 * When using react-markdown in TypeScript, we cannot define custom components
 * directly in the markdown string. Instead, we define custom tags (like <Affirmation>)
 * and process them into HTML strings (like <input> or <textarea>) before passing the
 * final HTML to react-markdown, otherwise the custom tags will not be recognized.
 */
abstract class CustomTag {
  abstract readonly tagName: string

  /**
   * Processes the custom tag and returns the corresponding HTML string.
   * Processor can render <input> and <textarea> using unique IDs (see function generateInputId()).
   * These form tags will be replaced automatically by their value in the final template.
   *
   * @param journal The journal configuration
   * @param attributes The attributes for the custom tag
   * @returns The HTML string to replace the custom tag
   *
   * @example
   * For a tag like <Prompt wikilink="prompts" throwAway />
   * - tagName would be "Prompt"
   * - attributes would be { wikilink: "prompts", throwAway: "" }
   *
   * The processor could return something like:
   * "Random prompt text\n\n<input type="text" class="Prompt" id="input-abc123" data-throw-away="true" />"
   * The input ID must be unique and can be generated using generateInputId().
   * The data-throw-away attribute indicates that the input value should not be saved.
   */
  abstract process(journal: JournalConfig, attributes: TagAttributes): Promise<string>
}

class AffirmationTag extends CustomTag {
  readonly tagName = 'Affirmation'

  // eslint-disable-next-line class-methods-use-this
  async process(journal: JournalConfig, attributes: TagAttributes): Promise<string> {
    const wikilink = attributes.wikilink
    if (!wikilink) {
      return '(Missing wikilink attribute)'
    }

    const tags = attributes.tags ? attributes.tags.split(',') : undefined

    try {
      const randomItem = await findRandomItemByWikilink(journal, wikilink, tags)
      if (randomItem && randomItem.text) {
        return randomItem.text
      }

      return '(No affirmations found)'
    } catch (error) {
      console.error('Error loading affirmation:', error)
      return '(Error loading affirmation)'
    }
  }
}

class PromptTag extends CustomTag {
  readonly tagName = 'Prompt'

  // eslint-disable-next-line class-methods-use-this
  async process(journal: JournalConfig, attributes: TagAttributes): Promise<string> {
    const wikilink = attributes.wikilink
    if (!wikilink) {
      return '(Missing wikilink attribute)'
    }

    const hasThrowAway = 'throwAway' in attributes
    const tags = attributes.tags ? attributes.tags.split(',') : undefined

    try {
      const randomItem = await findRandomItemByWikilink(journal, wikilink, tags)
      if (randomItem && randomItem.text) {
        const inputId = generateInputId()
        const dataAttr = hasThrowAway ? ' data-throw-away="true"' : ''
        const inputHtml = `<input type="text" class="Prompt" id="${inputId}"${dataAttr} />`
        return `${randomItem.text}\n\n${inputHtml}`
      }

      return '(No prompts found)'
    } catch (error) {
      console.error('Error loading prompt:', error)
      return '(Error loading prompt)'
    }
  }
}

class InputTag extends CustomTag {
  readonly tagName = 'Input'

  // eslint-disable-next-line class-methods-use-this
  async process(): Promise<string> {
    const inputId = generateInputId()
    return `<input type="text" class="Input" id="${inputId}" />`
  }
}

class MorningPagesTag extends CustomTag {
  readonly tagName = 'MorningPages'

  // eslint-disable-next-line class-methods-use-this
  async process(_journal: JournalConfig, attributes: TagAttributes): Promise<string> {
    const textareaId = generateInputId()
    const hasThrowAway = 'throwAway' in attributes
    const dataAttr = hasThrowAway ? ' data-throw-away="true"' : ''
    return `<textarea class="MorningPages" id="${textareaId}" rows="10" placeholder="Write your morning pages here..."${dataAttr}></textarea>`
  }
}

class CustomTagRegistry {
  private processors = new Map<string, CustomTag>()

  constructor() {
    this.registerDefaultTags()
  }

  private registerDefaultTags() {
    this.register(new AffirmationTag())
    this.register(new PromptTag())
    this.register(new InputTag())
    this.register(new MorningPagesTag())
  }

  register(processor: CustomTag) {
    this.processors.set(processor.tagName, processor)
  }

  async processTemplate(template: string, journal: JournalConfig): Promise<string> {
    let processedTemplate = template

    // Parse custom tags (tags starting with uppercase letter)
    const customTagRegex = /<([A-Z][a-zA-Z]*)\s*([^>]*?)\s*\/?>/g
    const matches = Array.from(template.matchAll(customTagRegex))

    // Process matches in reverse order to avoid position shifts
    for (const match of matches.reverse()) {
      const [fullMatch, tagName, attributesString] = match
      const processor = this.processors.get(tagName)

      if (processor) {
        const attributes = CustomTagRegistry.parseAttributes(attributesString)
        try {
          const replacement = await processor.process(journal, attributes)
          const startIndex = match.index!
          const endIndex = startIndex + fullMatch.length
          processedTemplate =
            processedTemplate.slice(0, startIndex) + replacement + processedTemplate.slice(endIndex)
        } catch (error) {
          console.error(`Error processing ${tagName} tag:`, error)
          const errorReplacement = `(Error processing ${tagName})`
          const startIndex = match.index!
          const endIndex = startIndex + fullMatch.length
          processedTemplate =
            processedTemplate.slice(0, startIndex) +
            errorReplacement +
            processedTemplate.slice(endIndex)
        }
      }
    }

    return processedTemplate
  }

  private static parseAttributes(attributesString: string): TagAttributes {
    const attributes: TagAttributes = {}

    // Parse attributes like wikilink="value" or standalone attributes like throwAway
    const attributeRegex = /(\w+)(?:="([^"]*)")?/g
    let match

    // eslint-disable-next-line no-cond-assign
    while ((match = attributeRegex.exec(attributesString)) !== null) {
      const [, name, value] = match
      attributes[name] = value || ''
    }

    return attributes
  }
}

type RenderedRoutineProps = {
  journal: JournalConfig
  routine: RoutineConfig
  onComplete?: () => void
}

/**
 * Component for rendering and processing routine templates.
 *
 * The template is rewritten to use HTML elements (like <input> and <textarea>) instead of
 * custom components because:
 * 1. The processed template is passed to <Markdown> which renders HTML strings
 * 2. React components cannot be dynamically created from string templates
 * 3. HTML inputs can be easily queried and their values extracted via DOM APIs
 * 4. This allows the template to be stored as a simple string while still
 *    providing interactive elements that can be filled out by the user
 */
export default function RenderedRoutine({ journal, routine, onComplete }: RenderedRoutineProps) {
  const markdownRef = useRef<HTMLDivElement>(null)
  const [processedTemplate, setProcessedTemplate] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const customTagRegistry = useRef(new CustomTagRegistry())

  // Process template when component mounts
  useEffect(() => {
    const processTemplate = async () => {
      try {
        const processed = await customTagRegistry.current.processTemplate(routine.template, journal)

        setProcessedTemplate(processed)
      } catch (error) {
        console.error('Error processing template:', error)
        setProcessedTemplate('Error processing template')
      }
    }

    processTemplate()
  }, [journal, routine])

  const appendToJournal = useCallback(async () => {
    if (!markdownRef.current) return

    setIsProcessing(true)
    try {
      // Get all input and textarea values
      const inputs = markdownRef.current.querySelectorAll('input[type="text"]')
      const textareas = markdownRef.current.querySelectorAll('textarea')
      let evaluatedTemplate = processedTemplate

      // Process input fields
      inputs.forEach((input) => {
        const inputElement = input as HTMLInputElement
        const inputId = inputElement.id
        const isThrowAway = inputElement.hasAttribute('data-throw-away')
        const value = isThrowAway ? '🗑️' : inputElement.value || ''

        // Replace the input HTML with the value
        const inputRegex = new RegExp(`<input[^>]*id="${inputId}"[^>]*\\/>`, 'g')
        evaluatedTemplate = evaluatedTemplate.replace(inputRegex, value)
      })

      // Process textarea fields
      textareas.forEach((textarea) => {
        const textareaElement = textarea as HTMLTextAreaElement
        const textareaId = textareaElement.id
        const isThrowAway = textareaElement.hasAttribute('data-throw-away')
        const value = isThrowAway ? '🗑️' : textareaElement.value || ''

        // Replace the textarea HTML with the value, preserving line breaks
        const textareaRegex = new RegExp(
          `<textarea[^>]*id="${textareaId}"[^>]*>[^<]*</textarea>`,
          'g'
        )
        evaluatedTemplate = evaluatedTemplate.replace(textareaRegex, value)
      })

      // Shift markdown headings (add two levels)
      evaluatedTemplate = evaluatedTemplate.replace(/^(#+)/gm, '##$1')

      // Evaluate template variables in journal path
      const journalPath = evaluateTemplateVariables(journal.path)

      // Prepare final content
      let finalContent = `\n\n## Routine: ${routine.name}\n\n${evaluatedTemplate}`

      // Check if journal file is new
      const content = await window.api.readNoteFile(journal.repository, journalPath)
      // If content is empty, we must prepend the template with the journal title
      const isNewFile = content.trim().length === 0
      if (isNewFile && journal.defaultContent) {
        // Evaluate template variables in defaultContent
        const fileContent = evaluateTemplateVariables(journal.defaultContent)
        finalContent = `${fileContent.trim()}\n\n${finalContent.trim()}`
      }

      // Call the appendToFile function
      await window.api.appendToFile(journal.repository, journalPath, finalContent)

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Error appending to journal:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [processedTemplate, journal, routine, onComplete])

  return (
    <div className="RenderedRoutine">
      <h2>{routine.name}</h2>
      <div className="RenderedRoutineTemplate" ref={markdownRef}>
        <Markdown ref={markdownRef} md={processedTemplate} />
      </div>
      <button type="button" onClick={appendToJournal} disabled={isProcessing}>
        <SaveIcon size={32} />
      </button>
    </div>
  )
}

/**
 * Find a random item in a note referenced by wikilink.
 * If tags array is provided, prefer items matching at least one tag.
 *
 * Tag matching uses only the ListItem.tags attribute. Neither the tag attribute on
 * the custom tag nor ListItem.tags include a leading '#' — tags are compared as plain strings.
 *
 * @param journal - Journal configuration
 * @param wikilink - wikilink to resolve the note
 * @param tags - optional array of tags (will be trimmed and lowercased)
 * @returns the selected ListItem or null if none found
 */
async function findRandomItemByWikilink(
  journal: JournalConfig,
  wikilink: string,
  tags?: string[]
): Promise<ListItem | null> {
  if (!wikilink) return null

  const note: Note = await window.api.findByWikilink(journal.repository, wikilink)

  if (
    !note ||
    !note.items ||
    !Array.isArray(note.items.children) ||
    note.items.children.length === 0
  ) {
    return null
  }

  const items: ListItem[] = note.items.children

  if (!tags || tags?.length === 0) {
    return items[Math.floor(Math.random() * items.length)]
  }

  const filtered = items.filter((item: ListItem) => {
    const itemTags = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : []
    return tags?.some((wt) => itemTags.includes(wt))
  })

  if (filtered.length === 0) return null

  return filtered[Math.floor(Math.random() * filtered.length)]
}
