import { Link } from "react-router-dom";
import { dojos } from "../../js/data/dojos.js";

const STATUS_LABEL = {
  ready: "Ready",
  not_yet: "Not yet",
  top_belt: "Highest belt",
  no_profile: "No belt recorded",
};

// Dojo names differ slightly between the database and the dojo directory
// ("Our Tampines Hub Dojo" and "Our Tampines Hub"), so compare them without
// the word "dojo", spaces or punctuation.
const simplify = (name) => (name || "").toLowerCase().replace(/\bdojo\b/g, "").replace(/[^a-z0-9]/g, "");
const REGION_OF = new Map(dojos.map((dojo) => [simplify(dojo.name), dojo.region]));
export const regionOf = (dojoName) => REGION_OF.get(simplify(dojoName)) || null;

// One student checked against the rules for their next belt, with green and
// red boxes for each rule. Used by the grading readiness and applicants pages.
// `children` adds extra lines under the student, such as an application status.
// The name links to the student's progress page (FSDP-21) unless linkName is false.
export default function ReadinessRow({ student, children, linkName = true }) {
  const region = regionOf(student.homeDojo);

  return (
    <li className={`readiness-row readiness-row-${student.status}`}>
      <div className="readiness-student">
        <strong>
          {linkName ? <Link to={`/instructor/students/${student.studentId}`}>{student.fullName}</Link> : student.fullName}
        </strong>
        <span className="roster-belt">
          {student.nextBelt ? `${student.currentBelt} to ${student.nextBelt}` : student.currentBelt || "No belt recorded"}
        </span>
        <span className="roster-belt">
          {student.homeDojo ? `${student.homeDojo}${region ? `, ${region}` : ""}` : "No home dojo"}
        </span>
        {children}
        <span className={`readiness-status readiness-status-${student.status}`}>
          {STATUS_LABEL[student.status]}
        </span>
      </div>

      {student.checks.length > 0 && (
        <dl className="readiness-checks">
          {student.checks.map((check) => (
            <div className={check.met ? "is-met" : "is-unmet"} key={check.key}>
              <dt>{check.label}</dt>
              <dd>
                <span className="readiness-mark">
                  <span aria-hidden="true">{check.met ? "✓ " : "✗ "}</span>
                  {check.met ? "Met" : "Not met"}
                </span>
                {check.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
