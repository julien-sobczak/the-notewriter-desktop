/* eslint-disable no-bitwise */
import { capitalize } from './helpers';

/* Determine a random color for each note type. */

// List of visually distinct CSS color names
const distinctColors = [
  'Gold',
  'DarkBlue',
  'OrangeRed',
  'Pink',
  'SeaGreen',
  'Yellow',
  'Tomato',
  'LightSkyBlue',
  'LightGray',
  'MediumVioletRed',
  'Teal',
  'SlateBlue',
  'Coral',
  'Olive',
  'DodgerBlue',
  'Crimson',
  'DarkCyan',
  'MediumSeaGreen',
  'SandyBrown',
  'Plum',
];

// Map to store assigned colors for each value
const assignedColors = new Map<string, string>();

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function getColorForValue(value: string): string {
  if (assignedColors.has(value)) {
    return assignedColors.get(value)!;
  }
  // Find the first unused color based on hash
  const hash = hashString(value);
  for (let i = 0; i < distinctColors.length; i++) {
    const idx = (hash + i) % distinctColors.length;
    const color = distinctColors[idx];
    if (![...assignedColors.values()].includes(color)) {
      assignedColors.set(value, color);
      return color;
    }
  }
  // Fallback if all colors are used
  return 'white';
}

type NoteTypeProps = {
  // type value
  value: string;
};

export default function NoteType({ value }: NoteTypeProps) {
  const currentValue = value || 'unknown';
  const color = getColorForValue(currentValue);
  const title = capitalize(currentValue);
  return (
    <span
      className="NoteType"
      title={title}
      style={{ backgroundColor: color }}
    />
  );
}
