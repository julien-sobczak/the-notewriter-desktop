/* eslint-disable no-template-curly-in-string */
import { useRef, useState, useCallback, useEffect } from 'react';
import { FloppyDisk as SaveIcon } from '@phosphor-icons/react';
import { JournalConfig, RoutineConfig, Note } from '../shared/Model';
import Markdown from './Markdown';

type RenderedRoutineProps = {
  journal: JournalConfig;
  routine: RoutineConfig;
  onComplete?: () => void;
};

/**
 * Evaluates template variables in a string using current date values
 */
function evaluateTemplateVariables(template: string): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  return template
    .replaceAll('${year}', year)
    .replaceAll('${month}', month)
    .replaceAll('${day}', day);
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
export default function RenderedRoutine({
  journal,
  routine,
  onComplete,
}: RenderedRoutineProps) {
  const markdownRef = useRef<HTMLDivElement>(null);
  const [processedTemplate, setProcessedTemplate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const inputIdCounterRef = useRef<number>(1);

  // Generate unique IDs for input elements
  const generateInputId = () => `input${inputIdCounterRef.current++}`;

  // Process template when component mounts
  useEffect(() => {
    // The template contains Markdown and special tags like <Affirmation />, <Prompt />, <Input /> and <MorningPages />.
    // The library react-markdown does not support custom components in TypeScript,
    // so we need to process the template first.
    // The function replaces the special tags with appropriate content.
    // - <Affirmation wikilink="..."/> is replaced by a random item from the specified note.
    // - <Prompt wikilink="..."/> is replaced by a random item from the specified note, followed by an input field.
    // - <Input /> is replaced by an input field.
    // - <MorningPages /> is replaced by a textarea for free-form writing.
    //   An id is generated for each input field/textarea to retrieve its value later.
    const processTemplate = async () => {
      let template = routine.template;
      inputIdCounterRef.current = 1; // Reset counter

      try {
        // Process <Affirmation /> tags
        const affirmationRegex = /<Affirmation\s+wikilink="([^"]+)"\s*\/>/g;
        let match;
        // eslint-disable-next-line no-cond-assign
        while ((match = affirmationRegex.exec(template)) !== null) {
          const wikilink = match[1];
          try {
            // eslint-disable-next-line no-await-in-loop
            const note: Note = await window.electron.findByWikilink(
              journal.repository,
              wikilink,
            );
            if (note && note.items && note.items.children.length > 0) {
              // Select random item
              const randomItem =
                note.items.children[
                  Math.floor(Math.random() * note.items.children.length)
                ];
              template = template.replace(match[0], randomItem.text);
            } else {
              template = template.replace(match[0], '(No affirmations found)');
            }
          } catch (error) {
            console.error('Error loading affirmation:', error);
            template = template.replace(
              match[0],
              '(Error loading affirmation)',
            );
          }
        }

        // Process <Prompt /> tags
        const promptRegex =
          /<Prompt\s+wikilink="([^"]+)"(\s+throwAway)?\s*\/>/g;
        let promptMatch;
        // eslint-disable-next-line no-cond-assign
        while ((promptMatch = promptRegex.exec(template)) !== null) {
          const wikilink = promptMatch[1];
          const hasThrowAway = !!promptMatch[2];
          try {
            // eslint-disable-next-line no-await-in-loop
            const note: Note = await window.electron.findByWikilink(
              journal.repository,
              wikilink,
            );
            if (note && note.items && note.items.children.length > 0) {
              // Select random item
              const randomItem =
                note.items.children[
                  Math.floor(Math.random() * note.items.children.length)
                ];
              const inputId = generateInputId();
              const dataAttr = hasThrowAway ? ' data-throw-away="true"' : '';
              const inputHtml = `<input type="text" class="Prompt" id="${inputId}"${dataAttr} />`;
              template = template.replace(
                promptMatch[0],
                `${randomItem.text}\n\n${inputHtml}`,
              );
            } else {
              template = template.replace(promptMatch[0], '(No prompts found)');
            }
          } catch (error) {
            console.error('Error loading prompt:', error);
            template = template.replace(
              promptMatch[0],
              '(Error loading prompt)',
            );
          }
        }

        // Process <Input /> tags
        template = template.replace(/<Input\s*\/>/g, () => {
          const inputId = generateInputId();
          return `<input type="text" class="Input" id="${inputId}" />`;
        });

        // Process <MorningPages /> tags
        const regexMorningPages = /<MorningPages(\s+throwAway)?\s*\/>/g;
        template = template.replace(regexMorningPages, (_, throwAwayAttr) => {
          const textareaId = generateInputId();
          const hasThrowAway = !!throwAwayAttr;
          const dataAttr = hasThrowAway ? ' data-throw-away="true"' : '';
          return `<textarea class="MorningPages" id="${textareaId}" rows="10" placeholder="Write your morning pages here..."${dataAttr}></textarea>`;
        });

        setProcessedTemplate(template);
      } catch (error) {
        console.error('Error processing template:', error);
        setProcessedTemplate('Error processing template');
      }
    };

    processTemplate();
  }, [journal, routine]);

  const appendToJournal = useCallback(async () => {
    if (!markdownRef.current) return;

    setIsProcessing(true);
    try {
      // Get all input and textarea values
      const inputs = markdownRef.current.querySelectorAll('input[type="text"]');
      const textareas = markdownRef.current.querySelectorAll('textarea');
      let evaluatedTemplate = processedTemplate;

      // Process input fields
      inputs.forEach((input) => {
        const inputElement = input as HTMLInputElement;
        const inputId = inputElement.id;
        const isThrowAway = inputElement.hasAttribute('data-throw-away');
        const value = isThrowAway ? '🗑️' : inputElement.value || '';

        // Replace the input HTML with the value
        const inputRegex = new RegExp(
          `<input[^>]*id="${inputId}"[^>]*\\/>`,
          'g',
        );
        evaluatedTemplate = evaluatedTemplate.replace(inputRegex, value);
      });

      // Process textarea fields
      textareas.forEach((textarea) => {
        const textareaElement = textarea as HTMLTextAreaElement;
        const textareaId = textareaElement.id;
        const isThrowAway = textareaElement.hasAttribute('data-throw-away');
        const value = isThrowAway ? '🗑️' : textareaElement.value || '';

        // Replace the textarea HTML with the value, preserving line breaks
        const textareaRegex = new RegExp(
          `<textarea[^>]*id="${textareaId}"[^>]*>[^<]*</textarea>`,
          'g',
        );
        evaluatedTemplate = evaluatedTemplate.replace(textareaRegex, value);
      });

      // Shift markdown headings (add two levels)
      evaluatedTemplate = evaluatedTemplate.replace(/^(#+)/gm, '##$1');

      // Evaluate template variables in journal path
      const journalPath = evaluateTemplateVariables(journal.path);

      // Prepare final content
      let finalContent = `\n\n## ${routine.name}\n\n${evaluatedTemplate}`;

      // Check if journal file is new
      const content = await window.electron.readNoteFile(
        journal.repository,
        journalPath,
      );
      // If content is empty, we must prepend the template with the journal title
      const isNewFile = content.trim().length === 0;
      if (isNewFile && journal.defaultContent) {
        // Evaluate template variables in defaultContent
        const fileContent = evaluateTemplateVariables(journal.defaultContent);
        finalContent = `${fileContent.trim()}\n\n${finalContent.trim()}`;
      }

      // Call the appendToFile function
      await window.electron.appendToFile(
        journal.repository,
        journalPath,
        finalContent,
      );

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error appending to journal:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [processedTemplate, journal, routine, onComplete]);

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
  );
}
