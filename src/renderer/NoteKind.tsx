import { capitalize } from './helpers';

type NoteKindProps = {
  // Kind value
  value: string;
};

const kindColors = new Map<string, string>([
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
]);

export default function NoteKind({ value }: NoteKindProps) {
  const color = kindColors.get(value) || 'white';
  const title = capitalize(value);
  return (
    <span
      className="NoteKind"
      title={title}
      style={{ backgroundColor: color }}
    />
  );
}
