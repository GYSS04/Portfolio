import { useEffect, useState } from 'react';

export default function Loader({ ready, progress }: { ready: boolean; progress: number }) {
  const [hidden, setHidden] = useState(false);
  const pct = Math.round(progress * 100);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setHidden(true), 350);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <div className={`loader${hidden ? ' hidden' : ''}`}>
      <div className="loader-inner">
        <div className="loader-title">GHAYAS SHER</div>
        <div className="loader-bar"><div className="loader-bar-fill" style={{ width: `${pct}%` }} /></div>
        <div className="loader-pct">{pct}%</div>
        <div className="loader-hint">Loading the room…</div>
      </div>
    </div>
  );
}
