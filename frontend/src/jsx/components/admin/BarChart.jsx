export default function BarChart({ title, data, valueKey, unit, formatLabel, formatDetail, describe }) {
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(...values, 0);
  const peakIndex = max > 0 ? values.lastIndexOf(max) : -1;
  const lastIndex = data.length - 1;

  return (
    <figure className="adm-bar-chart">
      <figcaption className="adm-bar-chart-title">{title}</figcaption>
      <ul className="adm-bar-plot" aria-hidden="true">
        {data.map((d, i) => {
          const value = d[valueKey];
          const height = max > 0 ? (value / max) * 100 : 0;
          const label = formatLabel(d);
          const showValue = value > 0 && (i === peakIndex || i === lastIndex);
          return (
            <li key={d.period} className="adm-bar-col">
              <span className="adm-bar-tip">
                <strong>{formatDetail(d)}</strong>
                {describe(d)}
              </span>
              <span className="adm-bar-track">
                {showValue && <span className="adm-bar-value" style={{ bottom: `${height}%` }}>{value}</span>}
                <span className="adm-bar" style={{ height: `${height}%` }} />
              </span>
              <span className="adm-bar-label">{label}</span>
            </li>
          );
        })}
      </ul>
      <div className="visually-hidden">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr><th scope="col">Period</th><th scope="col">{unit}</th><th scope="col">Details</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.period}><td>{formatDetail(d)}</td><td>{d[valueKey]}</td><td>{describe(d)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
