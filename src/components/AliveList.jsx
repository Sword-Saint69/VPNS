export default function AliveList({ lines, totalAlive }) {
  return (
    <div className="card">
      <div className="pre-wrap">
        {lines.length ? lines.join('\n') : '(none)'}
      </div>
      <div className="muted" style={{ marginTop: '8px' }}>
        {totalAlive.toLocaleString()} alive total &middot; full file linked
        above
      </div>
    </div>
  )
}
