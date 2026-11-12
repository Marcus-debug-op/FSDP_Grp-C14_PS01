import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getBelts, getCentres, searchStudents } from "../../../js/services/adminService.js";
import { formatShortDate } from "../../../js/utils/formatters.js";
import PageHeader from "../../components/admin/PageHeader.jsx";
import BeltOptions from "../../components/admin/BeltOptions.jsx";
import "../../../css/auth.css";
import "../../../css/admin.css";

function membershipText(student) {
  if (student.membershipActive) return `Active until ${formatShortDate(student.membershipEnd)}`;
  if (student.membershipStatus === "pending") return "Pending";
  if (student.membershipStatus) return "Expired";
  return "No membership";
}

export default function AdminStudents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryInput, setQueryInput] = useState(searchParams.get("q") || "");
  const query = searchParams.get("q") || "";
  const centreId = searchParams.get("dojo") || "";
  const beltId = searchParams.get("belt") || "";
  const [centres, setCentres] = useState([]);
  const [belts, setBelts] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    Promise.all([getCentres(), getBelts()])
      .then(([centreList, beltList]) => {
        setCentres(centreList);
        setBelts(beltList);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryInput.trim() !== query) setParam("q", queryInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    let active = true;
    setError("");
    searchStudents({ q: query, centreId, beltId })
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [query, centreId, beltId]);

  const filtered = query || centreId || beltId;

  return (
    <section className="section">
      <div className="container">
        <PageHeader eyebrow="Records" title="Students" lead="Find any student across every dojo and open their full record." />

        <div className="filters">
          <label className="adm-search">
            Search
            <input type="search" value={queryInput} maxLength={100} placeholder="Name or email"
                   onChange={(e) => setQueryInput(e.target.value)} />
          </label>
          <label>
            Home dojo
            <select value={centreId} onChange={(e) => setParam("dojo", e.target.value)}>
              <option value="">All dojos</option>
              {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            Belt
            <select value={beltId} onChange={(e) => setParam("belt", e.target.value)}>
              <option value="">All belts</option>
              <BeltOptions belts={belts} />
            </select>
          </label>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {!data && !error && <p>Loading...</p>}

        {data && (
          <p className="schedule-count" role="status">
            {data.total === 0
              ? filtered ? "No students match this search." : "No students yet."
              : data.total > data.students.length
                ? `Showing the first ${data.students.length} of ${data.total} students. Search to narrow it down.`
                : `${data.total} student${data.total === 1 ? "" : "s"}${filtered ? " found" : ""}`}
          </p>
        )}

        {data && data.students.length > 0 && (
          <table className="att-table adm-table">
            <caption className="visually-hidden">Students</caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Belt</th>
                <th scope="col">Home dojo</th>
                <th scope="col">Membership</th>
                <th scope="col" className="num">Credits</th>
                <th scope="col">Last class</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td data-label="Student">
                    <Link to={`/admin/students/${s.id}`} className="adm-link att-name">{s.fullName}</Link>
                    <span className="att-sub">{s.email}</span>
                  </td>
                  <td data-label="Belt">{s.beltName || "Not set"}</td>
                  <td data-label="Home dojo">{s.centreName || "Not set"}</td>
                  <td data-label="Membership">
                    <span className={s.membershipActive ? undefined : "adm-muted"}>{membershipText(s)}</span>
                  </td>
                  <td data-label="Credits" className="num">{s.credits}</td>
                  <td data-label="Last class">{s.lastAttended ? formatShortDate(s.lastAttended) : <span className="adm-muted">Never</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
