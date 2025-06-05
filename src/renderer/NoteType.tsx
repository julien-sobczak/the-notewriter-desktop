import { capitalize } from './helpers';

type NoteTypeProps = {
  // type value
  value: string;
};

const typeColors = new Map<string, string>([
  // See https://www.w3schools.com/cssref/css_colors.php
  ['free', 'Blue'],
  ['reference', 'DarkGrey'],
  ['note', 'Gold'],
  ['flashcard', 'DarkBlue'],
  ['cheatsheet', 'OrangeRed'],
  ['quote', 'Pink'],
  ['journal', 'SeaGreen'],
  ['todo', 'Yellow'],
  ['artwork', 'Tomato'],
  ['snippet', 'LightSkyBlue'],
  ['unknown', 'LightGray'],
]);

export default function NoteType({ value }: NoteTypeProps) {
  let currentValue = value;
  if (!value) {
    currentValue = 'unknown';
  }
  const color = typeColors.get(currentValue) || 'white';
  const title = capitalize(currentValue);
  return (
    <span
      className="NoteType"
      title={title}
      style={{ backgroundColor: color }}
    />
  );
}
