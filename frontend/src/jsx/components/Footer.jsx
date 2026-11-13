import { Link } from "react-router-dom";
import { site } from "../../js/data/siteInfo.js";

// Public footer: contact details on the left, links grouped by what people want to do.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <img src="/images/logo.png" alt="Aikido Shinju-Kai logo" width="64" height="64" />
          <div>
            <strong>{site.name}</strong>
            <p>{site.hqName}<br />{site.hqAddress}</p>
            <p>
              <a href={`mailto:${site.email}`}>{site.email}</a>
              {" "}&middot;{" "}
              <a href={site.phoneHref}>{site.phoneDisplay}</a>
            </p>
            <p>Office hours: {site.officeHours.map((o) => `${o.days} ${o.hours}`).join(", ")}</p>
          </div>
        </div>
        <nav aria-label="Footer" className="footer-cols">
          <div>
            <h2 className="footer-heading">Train</h2>
            <ul>
              <li><Link to="/classes">Classes</Link></li>
              <li><Link to="/schedule">Timetable</Link></li>
              <li><Link to="/dojos">Find a dojo</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer-heading">Join</h2>
            <ul>
              <li><Link to="/join">How to join &amp; fees</Link></li>
              <li><Link to="/join#faq">FAQ</Link></li>
              <li><Link to="/signup">Become a member</Link></li>
              <li><Link to="/signin">Member sign in</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer-heading">About</h2>
            <ul>
              <li><Link to="/about">Our story</Link></li>
              <li><Link to="/about#instructors">Instructors</Link></li>
              <li><Link to="/contact">Contact us</Link></li>
            </ul>
          </div>
        </nav>
      </div>
      <p className="container footer-note">
        &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
      </p>
    </footer>
  );
}
