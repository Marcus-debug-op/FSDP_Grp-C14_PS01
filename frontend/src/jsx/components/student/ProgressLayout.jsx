import { NavLink } from "react-router-dom";
import "../../../css/belt.css";

export default function ProgressLayout({ title, subtitle, children }) {
  return (
    <section className="prog">
      <div className="prog-wrap">
        <nav className="prog-tabs" aria-label="Training progress">
          <NavLink to="/belt-progress" className="prog-tab">My Belt</NavLink>
          <NavLink to="/grading" className="prog-tab">Grading</NavLink>
        </nav>
        <header className="prog-head">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export function Swatch({ colour, size }) {
  return (
    <span
      className={size === "lg" ? "prog-swatch is-lg" : "prog-swatch"}
      style={{ background: colour }}
      aria-hidden="true"
    />
  );
}

export function Bar({ percent, label }) {
  return (
    <div
      className="prog-bar"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
