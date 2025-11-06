export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * Evaluate template variables in a path or template string.
 *
 * Recognized variables:
 * - ${year}  -> 2025
 * - ${month} -> 09 (zero-padded)
 * - ${day}   -> 30 (zero-padded)
 *
 * @param template - The string that may contain template variables.
 * @returns The string with variables replaced using the current date.
 *
 * @example
 * evaluateTemplateVariables("notes/${year}-${month}-${day}.md");
 */
export function evaluateTemplateVariables(template: string): string {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')

  return template
    .replaceAll('${year}', year)
    .replaceAll('${month}', month)
    .replaceAll('${day}', day)
}
