/** Horizontal bar with a narrow green zone in the middle; purely visual, the precision comes from `stop()`. */
export function TimingBar({ marker, label }: { readonly marker: number; readonly label: string }) {
  return <div className="dribble-timing"><div className="dribble-bar shot-bar" role="img" aria-label={label}><i className="dribble-sweet" /><i className="dribble-marker" style={{ left: `${marker * 100}%` }} /></div></div>
}
