import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { createCheckInQr } from "../../../js/services/checkInService.js";
import { getRoster } from "../../../js/services/instructorService.js";
import { formatTime } from "../../../js/utils/formatters.js";
import InstructorNavbar from "../../components/InstructorNavbar.jsx";
import BackButton from "../../components/BackButton.jsx";
import "../../../css/instructor.css";
import "../../../css/checkin.css";

// Instructor screen: shows a QR code for one class. The code changes every
// 30 seconds (each one only works for 60 s), so a photo of it can't be reused later.
// Students scan it with their phone camera, which opens the check-in page.
const REFRESH_MS = 30000;
const ROSTER_MS = 10000;

export default function CheckInQr() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [qrImage, setQrImage] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ checkedIn: 0, total: 0 });

  // New code every 30 seconds.
  useEffect(() => {
    let stopped = false;
    async function refresh() {
      try {
        const data = await createCheckInQr(id);
        const url = `${window.location.origin}/check-in?t=${encodeURIComponent(data.token)}`;
        const image = await QRCode.toDataURL(url, { width: 420, margin: 1 });
        if (stopped) return;
        setSession(data.session);
        setLink(url);
        setQrImage(image);
        setError("");
      } catch (err) {
        if (!stopped) { setQrImage(""); setError(err.message); }
      }
    }
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [id]);

  // Live count of who has checked in.
  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const data = await getRoster(id);
        if (stopped) return;
        setCounts({
          checkedIn: data.roster.filter((s) => s.status === "present").length,
          total: data.roster.length,
        });
      } catch { /* the QR itself still works */ }
    }
    load();
    const timer = setInterval(load, ROSTER_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [id]);

  return (
    <div className="instructor-portal">
      <InstructorNavbar />
      <section className="section">
        <div className="container ci-qr-page">
          <BackButton />
          <p className="eyebrow">Class check-in</p>
          <h1>{session ? session.title : "Check-in QR code"}</h1>
          {session && <p className="lead">{session.centre}, {formatTime(session.startTime)} - {formatTime(session.endTime)}</p>}

          {error && <p className="form-error" role="alert">{error}</p>}

          {qrImage && (
            <div className="ci-qr-layout">
              <figure className="ci-qr-box">
                <img src={qrImage} alt="Check-in QR code for this class" width="420" height="420" />
                <figcaption>Code refreshes every 30 seconds</figcaption>
              </figure>
              <div className="ci-qr-side">
                <p className="ci-count"><strong>{counts.checkedIn}</strong> of {counts.total} booked students checked in</p>
                <ol className="ci-steps">
                  <li>Students open their phone camera</li>
                  <li>Point it at this code</li>
                  <li>Tap the link, signed in to their account</li>
                </ol>
                <p className="ci-note">Students without a booking or active membership can't check in. Mark them on the class roster instead.</p>
                {/* Only shown while developing, to test without a phone. */}
                {import.meta.env.DEV && <p className="ci-dev">Testing on one computer? Open this link in another browser signed in as a student: <a href={link} target="_blank" rel="noreferrer">check-in link</a></p>}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
