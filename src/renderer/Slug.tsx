type SlugProps = {
  value: string;
};

export default function Slug({ value }: SlugProps) {
  return <span className="Slug">{value}</span>;
}
