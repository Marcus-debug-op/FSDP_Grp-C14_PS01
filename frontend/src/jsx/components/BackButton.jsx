import { useNavigate } from "react-router-dom";

// Goes back to the page the user came from. If they opened this page directly
// (a bookmark or a typed address), there is no earlier page inside the site,
// so it goes to `fallback` instead.
export default function BackButton({ fallback = "/dashboard" }) {
  const navigate = useNavigate();

  function goBack() {
    // React Router counts pages visited in this tab; 0 means this is the first.
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fallback);
  }

  return (
    <button type="button" className="btn btn-outline btn-small back-button" onClick={goBack}>
      <span aria-hidden="true">←</span> Back
    </button>
  );
}
