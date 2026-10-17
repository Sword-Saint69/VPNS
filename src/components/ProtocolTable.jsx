export default function ProtocolTable({ summary }) {
  const aliveBy = summary.by_protocol_alive || {}
  const deadBy = summary.by_protocol_dead || {}
  const protos = new Set([...Object.keys(aliveBy), ...Object.keys(deadBy)])
  const rows = [...protos]
    .map((p) => ({
      proto: p,
      alive: aliveBy[p] || 0,
      dead: deadBy[p] || 0,
    }))
    .sort((x, y) => y.alive - x.alive || y.dead - x.dead)

  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Protocol</th>
            <th>Alive</th>
            <th>Dead</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.proto}>
              <td>{r.proto}</td>
              <td className={r.alive ? 'ok' : 'muted'}>
                {r.alive.toLocaleString()}
              </td>
              <td className={r.dead ? 'bad' : 'muted'}>
                {r.dead.toLocaleString()}
              </td>
              <td>{(r.alive + r.dead).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
