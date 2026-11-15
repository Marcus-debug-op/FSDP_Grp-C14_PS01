// Shown on a class that an admin moved to another dojo for that day only.
// `session` comes from the instructor API: venueChanged, usualCentre, changeNote.
export default function MovedNote({ session }) {
  if (!session.venueChanged) return null;
  return (
    <p className="moved-note">
      <strong>Moved for this day</strong> (usually at {session.usualCentre}).
      {session.changeNote ? ` ${session.changeNote}` : ""}
    </p>
  );
}
