import { Link } from "react-router-dom";

function crumbsFor(eyebrow, title) {
  const parts = eyebrow.split("\u00b7").map((part) => part.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && title.toLowerCase().includes(last.toLowerCase())) parts.pop();
  parts.push(title);
  return parts;
}

export default function PageHeader({ eyebrow, title, lead, actions, feature = false, children }) {
  if (feature) {
    return (
      <header className="adm-hero adm-hero-feature">
        <div className="adm-hero-text">
          <h1>{title}</h1>
          {eyebrow && <p className="adm-hero-eyebrow">{eyebrow}</p>}
          {lead && <p className="adm-hero-lead">{lead}</p>}
          {children}
        </div>
        {actions && <div className="adm-hero-actions">{actions}</div>}
        <img className="adm-hero-art" src="/images/logo.png" alt="" width="208" height="208" />
      </header>
    );
  }

  return (
    <header className="adm-hero">
      <div className="adm-hero-text">
        <h1>{title}</h1>
        {eyebrow && (
          <ol className="adm-crumbs" aria-label="You are here">
            <li><Link to="/dashboard">Dashboard</Link></li>
            {crumbsFor(eyebrow, title).map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ol>
        )}
        {lead && <p className="adm-hero-lead">{lead}</p>}
        {children}
      </div>
      {actions && <div className="adm-hero-actions">{actions}</div>}
    </header>
  );
}
