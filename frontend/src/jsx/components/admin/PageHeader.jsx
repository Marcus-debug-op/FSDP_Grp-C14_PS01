export default function PageHeader({ eyebrow, title, lead, actions, children }) {
  return (
    <header className="adm-hero">
      <div className="adm-hero-text">
        {eyebrow && <p className="adm-hero-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lead && <p className="adm-hero-lead">{lead}</p>}
        {children}
      </div>
      {actions && <div className="adm-hero-actions">{actions}</div>}
    </header>
  );
}
