import React, { useRef, useState, useCallback } from 'react';
import { JournalConfig, RoutineConfig, Note } from '../shared/Model';
import Markdown from './Markdown';

type RenderedRoutineProps = {
  journal: JournalConfig;
  routine: RoutineConfig;
};

export default function RenderedRoutine({
  journal,
  routine,
}: RenderedRoutineProps) {
  const markdownRef = useRef<HTMLDivElement>(null);
  const [processedTemplate, setProcessedTemplate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Generate unique IDs for input elements
  let inputIdCounter = 1;
  const generateInputId = () => `input${inputIdCounter++}`;

  // Process template when component mounts
  React.useEffect(() => {
    const processTemplate = async () => {
      let template = routine.template;
      inputIdCounter = 1; // Reset counter

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
            if (note && note.items && note.items.length > 0) {
              // Select random item
              const randomItem =
                note.items[Math.floor(Math.random() * note.items.length)];
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
        const promptRegex = /<Prompt\s+wikilink="([^"]+)"\s*\/>/g;
        let promptMatch;
        // eslint-disable-next-line no-cond-assign
        while ((promptMatch = promptRegex.exec(template)) !== null) {
          const wikilink = promptMatch[1];
          try {
            // eslint-disable-next-line no-await-in-loop
            const note: Note = await window.electron.findByWikilink(
              journal.repository,
              wikilink,
            );
            if (note && note.items && note.items.length > 0) {
              // Select random item
              const randomItem =
                note.items[Math.floor(Math.random() * note.items.length)];
              const inputId = generateInputId();
              template = template.replace(
                promptMatch[0],
                `${randomItem.text}\n\n<input type="text" class="Prompt" id="${inputId}" />`,
              );
            } else {
              const inputId = generateInputId();
              template = template.replace(
                promptMatch[0],
                `(No prompts found)\n\n<input type="text" class="Prompt" id="${inputId}" />`,
              );
            }
          } catch (error) {
            console.error('Error loading prompt:', error);
            const inputId = generateInputId();
            template = template.replace(
              promptMatch[0],
              `(Error loading prompt)\n\n<input type="text" class="Prompt" id="${inputId}" />`,
            );
          }
        }

        // Process <Input /> tags
        template = template.replace(/<Input\s*\/>/g, () => {
          const inputId = generateInputId();
          return `<input type="text" class="Input" id="${inputId}" />`;
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
      // Get all input values
      const inputs = markdownRef.current.querySelectorAll('input[type="text"]');
      let evaluatedTemplate = processedTemplate;

      inputs.forEach((input) => {
        const inputElement = input as HTMLInputElement;
        const inputId = inputElement.id;
        const value = inputElement.value || '';

        // Replace the input HTML with the value
        const inputRegex = new RegExp(
          `<input[^>]*id="${inputId}"[^>]*\\/>`,
          'g',
        );
        evaluatedTemplate = evaluatedTemplate.replace(inputRegex, value);
      });

      // Shift markdown headings (add one level)
      evaluatedTemplate = evaluatedTemplate.replace(/^(#+)/gm, '#$1');

      // Get current date for path variables
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');

      // Replace path variables
      let journalPath = journal.path;
      journalPath = journalPath.replace(/\$\{year\}/g, year);
      journalPath = journalPath.replace(/\$\{month\}/g, month);
      journalPath = journalPath.replace(/\$\{day\}/g, day);

      // Prepare final content
      const finalContent = `\n\n## ${routine.name}\n\n${evaluatedTemplate}`;

      // Call the appendToFile function
      await window.electron.appendToFile(
        journal.repository,
        journalPath,
        finalContent,
      );

      // eslint-disable-next-line no-alert
      alert('Successfully appended to journal!');

      // Clear all inputs
      inputs.forEach((input) => {
        (input as HTMLInputElement).value = '';
      });
    } catch (error) {
      console.error('Error appending to journal:', error);
      // eslint-disable-next-line no-alert
      alert(`Error appending to journal: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [processedTemplate, journal, routine]);

  return (
    <div className="RenderedRoutine">
      <h2>{routine.name}</h2>
      <Markdown ref={markdownRef} md={processedTemplate} />
      <button
        type="button"
        onClick={appendToJournal}
        disabled={isProcessing}
        style={{ marginTop: '20px', padding: '10px 20px' }}
      >
        {isProcessing ? 'Appending...' : 'Append to journal'}
      </button>
    </div>
  );
}
