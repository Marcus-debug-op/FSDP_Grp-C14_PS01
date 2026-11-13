const LADDERS = [
  { key: "adult", label: "Adult belts" },
  { key: "children", label: "Children's belts" },
];

export default function BeltOptions({ belts }) {
  return LADDERS.map((ladder) => {
    const group = belts.filter((b) => (b.ladder || "adult") === ladder.key);
    if (group.length === 0) return null;
    return (
      <optgroup key={ladder.key} label={ladder.label}>
        {group.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </optgroup>
    );
  });
}
