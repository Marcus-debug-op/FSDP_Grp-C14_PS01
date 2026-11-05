import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/admin/schedule", label: "Schedule" },
  { to: "/admin/dojos", label: "Dojos & Rooms" },
];

export default function AdminTabs() {
  return (
    <nav className="admin-tabs" aria-label="Admin">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end className="nav-link">{link.label}</NavLink>
      ))}
    </nav>
  );
}
