import { Link } from "react-router-dom";
import { HQ_ADDRESS } from "../data/hqClasses.js";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <img src="/images/logo.png" alt="Aikido Shinju-Kai logo" width="64" height="64" />
          <div>
            <strong>Aikido Shinju-Kai</strong>
            <p>Headquarters Dojo: {HQ_ADDRESS}</p>
            <p>
              <a href="mailto:hq@aikidoshinjukai.com.sg">hq@aikidoshinjukai.com.sg</a>
              {" "}&middot;{" "}
              <a href="tel:+6565131588">(+65) 6513 1588</a>
            </p>
            <p>Office hours: Mon&ndash;Fri 10am&ndash;9pm, Sat&ndash;Sun 8am&ndash;6pm</p>
          </div>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li><Link to="/classes">Classes</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/signin">Sign In</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
          </ul>
        </nav>
      </div>
      <p className="container footer-note">
        &copy; {new Date().getFullYear()} Aikido Shinju-Kai. All rights reserved.
      </p>
    </footer>
  );
}
