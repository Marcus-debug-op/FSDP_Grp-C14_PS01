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
        {lead && <p className="adm-hero-lead">{lead}</p>}
        {children}
      </div>
      {actions && <div className="adm-hero-actions">{actions}</div>}
    </header>
  );
}
