import { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cancelCoverLesson, getCoverAvailability, getCoverRequests, offerCover } from "../../../js/services/adminService.js";
import { formatShortDate, formatTime } from "../../../js/utils/formatters.js";
import PageHeader from "../../components/admin/PageHeader.jsx";
import OfferRow from "../../components/admin/OfferRow.jsx";
import "../../../css/auth.css";
import "../../../css/admin.css";

const VIEWS = [
  { key: "open", label: "Open" },
  { key: "recent", label: "Recent" },
];

function students(n) {
  return `${n} student${n === 1 ? "" : "s"}`;
}

function when(session) {
  return `${formatShortDate(session.date)}, ${formatTime(session.startTime)} - ${formatTime(session.endTime)}`;
}

function OfferCell({ request }) {
  const { offer, declined, session } = request;
  const others = declined.filter((d) => !offer || d.id !== offer.instructor.id);
  return (
    <td data-label="Cover">
      <div>
        {session.status === "cancelled" ? (
          <span className="offer-tag offer-no">Lesson already cancelled</span>
        ) : session.hasStarted ? (
          <span className="offer-tag offer-no">Started without cover</span>
        ) : !offer ? (
          <span className="offer-tag offer-no">Needs cover</span>
        ) : offer.status === "pending" ? (
          <>
            <span className="offer-tag offer-wait">Waiting for reply</span>
            <span className="att-sub">Offered to {offer.instructor.name}</span>
          </>
        ) : offer.status === "declined" ? (
          <>
            <span className="offer-tag offer-no">Declined</span>
            <span className="att-sub">
              {offer.instructor.name}
              {offer.note ? `: "${offer.note}"` : ""}
            </span>
          </>
        ) : (
          <span className="offer-tag offer-ok">Accepted by {offer.instructor.name}</span>
        )}
        {others.length > 0 && <span className="att-sub">Also declined: {others.map((d) => d.name).join(", ")}</span>}
      </div>
    </td>
  );
}

function CancelLessonRow({ request, colSpan, onDone, onClose }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { session } = request;

  async function confirm(event) {
    event.preventDefault();
    if (!reason.trim()) return setError("Please give a short reason. Students will see it.");
    setSaving(true);
    setError("");
    try {
      onDone(request, await cancelCoverLesson(request.id, reason.trim()));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <tr className="att-detail-row">
      <td colSpan={colSpan}>
        <form className="lesson-cancel" onSubmit={confirm}>
          <p>
            Cancel {session.title} on {when(session)} for everyone?
            {session.booked > 0
              ? ` ${students(session.booked)} booked will get their credits back and a notice.`
              : " Nobody has booked it yet."}
          </p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <label>
            Reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Students will see this" />
          </label>
          <div className="card-actions">
            <button type="submit" className="btn btn-outline btn-small" disabled={saving}>
              {saving ? "Cancelling..." : "Cancel Lesson"}
            </button>
            <button type="button" className="link-button" onClick={onClose}>Keep it</button>
          </div>
        </form>
      </td>
    </tr>
  );
}

export default function AdminCoverRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = VIEWS.some((v) => v.key === searchParams.get("view")) ? searchParams.get("view") : "open";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    getCoverRequests(view)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [view, reload]);

  function changeView(key) {
    setOpen(null);
    setSearchParams(key === "open" ? {} : { view: key }, { replace: true });
  }

  async function sendOffer(request, instructorId) {
    const updated = await offerCover(request.id, instructorId);
    setOpen(null);
    setNotice(`Asked ${updated.offer.instructor.name} to cover ${request.session.title} on ${when(request.session)}.`);
    setReload((n) => n + 1);
  }

  async function closeRequest(request) {
    setError("");
    try {
      await cancelCoverLesson(request.id, "Lesson already cancelled");
      setNotice(`Closed the cover request for ${request.session.title} on ${when(request.session)}.`);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCancelled(request, result) {
    setOpen(null);
    setNotice(
      `Cancelled ${request.session.title} on ${when(request.session)}.` +
        (result.studentsTold > 0 ? ` ${students(result.studentsTold)} told and given their credits back.` : "")
    );
    setReload((n) => n + 1);
  }

  const ready = data && data.view === view;
  const requests = ready ? data.requests : [];
  const counts = data ? data.counts : null;

  return (
    <section className="section">
      <div className="container">
        <PageHeader
          eyebrow="Scheduling"
          title="Cover Requests"
          lead="Instructors who can't teach a class ask for cover here. Offer the class to someone who is free. If nobody can take it, cancel it and booked students get their credits back."
        />

        {notice && <p className="notice admin-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="adm-toolbar">
          <div className="auth-toggle" role="group" aria-label="Requests to show">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => changeView(v.key)}>
                {v.label}
                {v.key === "open" && counts && counts.open > 0 ? ` (${counts.open})` : ""}
              </button>
            ))}
          </div>
        </div>

        {!ready && !error && <p>Loading...</p>}

        {ready && requests.length === 0 && (
          <p className="adm-empty">{view === "open" ? "No classes need cover right now." : "No cover requests closed in the last 14 days."}</p>
        )}

        {ready && requests.length > 0 && view === "open" && (
          <table className="att-table adm-table lesson-table cover-table">
            <caption className="visually-hidden">Open cover requests</caption>
            <thead>
              <tr>
                <th scope="col">Lesson</th>
                <th scope="col">Dojo</th>
                <th scope="col">Asked by</th>
                <th scope="col">Cover</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const pending = r.offer?.status === "pending";
                const isCancelled = r.session.status === "cancelled";
                const canAct = !isCancelled && !r.session.hasStarted && r.offer?.status !== "accepted";
                return (
                  <Fragment key={r.id}>
                    <tr>
                      <td data-label="Lesson">
                        <div>
                          <span className="att-name">{r.session.title}</span>
                          <span className="att-sub">{when(r.session)}</span>
                          <span className="att-sub">{students(r.session.booked)} booked</span>
                        </div>
                      </td>
                      <td data-label="Dojo">{r.session.centre.name}</td>
                      <td data-label="Asked by">
                        <div>
                          <span className="att-name">{r.originalInstructor.name}</span>
                          <span className="att-sub">"{r.reason}"</span>
                        </div>
                      </td>
                      <OfferCell request={r} />
                      <td className="lesson-actions">
                        {canAct && (
                          <button
                            type="button"
                            className={pending ? "link-button" : "btn btn-primary btn-small"}
                            onClick={() => setOpen({ id: r.id, kind: "offer" })}
                          >
                            {pending ? "Offer to someone else" : r.offer ? "Pick Another" : "Find Cover"}
                          </button>
                        )}
                        {isCancelled && (
                          <button type="button" className="btn btn-outline btn-small" onClick={() => closeRequest(r)}>
                            Close request
                          </button>
                        )}
                        {canAct && (
                          <button type="button" className="link-button" onClick={() => setOpen({ id: r.id, kind: "cancel" })}>
                            Cancel lesson
                          </button>
                        )}
                      </td>
                    </tr>
                    {open?.id === r.id && open.kind === "offer" && (
                      <OfferRow
                        colSpan={5}
                        prompt={`Who can cover ${r.session.title} on ${when(r.session)} at ${r.session.centre.name}?`}
                        hint={
                          pending
                            ? `This takes the offer back from ${r.offer.instructor.name}.`
                            : "They get a request to accept or decline. Instructors with a class, private lesson or another cover offer at this time can't be picked."
                        }
                        loadInstructors={() => getCoverAvailability(r.id)}
                        onOffer={(instructorId) => sendOffer(r, instructorId)}
                        onClose={() => setOpen(null)}
                      />
                    )}
                    {open?.id === r.id && open.kind === "cancel" && (
                      <CancelLessonRow request={r} colSpan={5} onDone={handleCancelled} onClose={() => setOpen(null)} />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {ready && requests.length > 0 && view === "recent" && (
          <table className="att-table adm-table lesson-table cover-table">
            <caption className="visually-hidden">Closed cover requests</caption>
            <thead>
              <tr>
                <th scope="col">Lesson</th>
                <th scope="col">Dojo</th>
                <th scope="col">Asked by</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td data-label="Lesson">
                    <div>
                      <span className="att-name">{r.session.title}</span>
                      <span className="att-sub">{when(r.session)}</span>
                    </div>
                  </td>
                  <td data-label="Dojo">{r.session.centre.name}</td>
                  <td data-label="Asked by">
                    <div>
                      <span className="att-name">{r.originalInstructor.name}</span>
                      <span className="att-sub">"{r.reason}"</span>
                    </div>
                  </td>
                  <td data-label="Outcome">
                    <div>
                      {r.status === "covered" ? (
                        <span className="offer-tag offer-ok">Covered by {r.teachingInstructor.name}</span>
                      ) : (
                        <>
                          <span className="offer-tag offer-no">Lesson cancelled</span>
                          {r.resolvedBy && <span className="att-sub">By {r.resolvedBy}</span>}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
