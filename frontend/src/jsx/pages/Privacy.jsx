import { Link } from "react-router-dom";
import { site } from "../../js/data/siteInfo.js";
import usePageTitle from "../../js/hooks/usePageTitle.js";

// Public Privacy Policy page (also linked from the footer and from the
// Google sign-in screen used to send emails).
const CONTACT_EMAIL = "shinjukai.fsdp@gmail.com";
const UPDATED = "21 November 2026";

export default function Privacy() {
  usePageTitle("Privacy Policy");

  return (
    <>
      <section className="section">
        <div className="container">
          <p className="eyebrow">Privacy</p>
          <h1>Privacy Policy</h1>
          <p className="lead">How this website collects, uses and protects your personal data. Last updated {UPDATED}.</p>
          <p>
            This website is a student project prototype built by FSDP Group C14 (Ngee Ann Polytechnic) for {site.name}.
            We follow the principles of Singapore's Personal Data Protection Act (PDPA).
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your name, email address and password (stored only as a secure hash, never in plain text).</li>
            <li><strong>Sign-up details:</strong> date of birth, gender, contact number, address and postal code, emergency contact, preferred dojo, and any previous aikido experience.</li>
            <li><strong>Files you upload:</strong> your profile photo and, if you have one, your grading certificate.</li>
            <li><strong>Training records:</strong> lesson bookings, attendance and check-ins, belt progress and grading applications.</li>
            <li><strong>Payments:</strong> what you paid for and when. Card details are entered on Stripe's secure page and are never stored by us.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To create and manage your membership, and to check your application, photo and certificate.</li>
            <li>To let you book lessons, check in to class and track your progress towards your next belt.</li>
            <li>To process payments and keep a record of them.</li>
            <li>To send you account emails, such as a welcome email, payment receipts and booking confirmations. We do not send marketing emails.</li>
          </ul>

          <h2>Who can see it</h2>
          <ul>
            <li>Admins can see your application, photo, certificate and records to manage memberships.</li>
            <li>Instructors can see what they need to run classes and gradings, such as your name, belt, bookings and attendance.</li>
            <li>We never sell your data or share it for advertising.</li>
          </ul>

          <h2>Services we use</h2>
          <ul>
            <li><strong>Stripe</strong> processes payments.</li>
            <li><strong>Google (Gmail)</strong> delivers account emails.</li>
            <li><strong>Vercel, Render and Neon</strong> host the website, server and database.</li>
          </ul>

          <h2>Keeping it safe</h2>
          <p>
            Data is sent over encrypted HTTPS connections. Each page and action checks that you are signed in and
            allowed to see it, and uploaded photos and certificates are only shown to signed-in staff.
          </p>

          <h2>Your choices</h2>
          <p>
            You can view your details on your profile page and update your contact details in your settings.
            To ask for a copy of your data, a correction, or to have your account deleted, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <p>
            <Link to="/contact">Contact us</Link> with any other questions.
          </p>
        </div>
      </section>
    </>
  );
}
