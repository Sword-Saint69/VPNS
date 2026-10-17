export default function StatsGrid({
  total,
  alive,
  dead,
  rate,
  fetched,
  given,
  updated,
}) {
  return (
    <div className="grid">
      <div className="card">
        <h2>Total checked</h2>
        <div className="big">{total.toLocaleString()}</div>
      </div>
      <div className="card">
        <h2>Alive</h2>
        <div className="big ok">{alive.toLocaleString()}</div>
      </div>
      <div className="card">
        <h2>Dead</h2>
        <div className="big bad">{dead.toLocaleString()}</div>
      </div>
      <div className="card">
        <h2>Alive rate</h2>
        <div className="big">{rate}%</div>
      </div>
      <div className="card">
        <h2>Links fetched OK</h2>
        <div className="big">{fetched}</div>
      </div>
      <div className="card">
        <h2>Links given</h2>
        <div className="big">{given}</div>
      </div>
      <div className="card">
        <h2>Last updated</h2>
        <div className="big muted" style={{ fontSize: '1.1rem' }}>
          {updated}
        </div>
      </div>
    </div>
  )
}
