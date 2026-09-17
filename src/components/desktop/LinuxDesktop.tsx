import { useEffect, useState } from 'react';
import FilesApp from './FilesApp';
import TerminalApp from './TerminalApp';
import { PROFILE } from '../../data/resume';

type AppId = 'files' | 'terminal';

interface LinuxDesktopProps {
  onClose: () => void;
}

const USERNAME = PROFILE.name.split(' ')[0].toLowerCase();

export default function LinuxDesktop({ onClose }: LinuxDesktopProps) {
  const [activeApp, setActiveApp] = useState<AppId>('files');
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dateStr = clock.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const openApp = (id: AppId) => {
    setActiveApp(id);
    setMenuOpen(false);
  };

  return (
    <div className="os" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}>
      <div className="os-wallpaper" />

      <div className="os-topbar" onClick={(e) => e.stopPropagation()}>
        <div className="os-topbar-left">
          <div className="os-menu-wrap">
            <button className="os-menu-btn" onClick={() => setMenuOpen((v) => !v)}>
              <span className="os-kali-mark" aria-hidden>🐉</span> Applications
            </button>
            {menuOpen && (
              <div className="os-menu-dropdown">
                <button onClick={() => openApp('files')}><span>📁</span> File Manager</button>
                <button onClick={() => openApp('terminal')}><span>▌</span> Terminal</button>
              </div>
            )}
          </div>
          <span className="os-topbar-label">Places</span>
          <span className="os-topbar-label">System</span>
        </div>
        <div className="os-topbar-right">
          <span className="os-tray-icon" title="Network">📶</span>
          <span className="os-tray-icon" title="Volume">🔊</span>
          <span className="os-clock">{dateStr} · {timeStr}</span>
          <button className="os-power-btn" onClick={onClose} aria-label="Power off">⏻</button>
        </div>
      </div>

      <div className="os-desktop-icons">
        <button className="os-desktop-icon" onClick={() => openApp('files')}>
          <span className="os-desktop-icon-glyph">🏠</span>
          <span>home</span>
        </button>
        <button className="os-desktop-icon" onClick={() => openApp('terminal')}>
          <span className="os-desktop-icon-glyph">&gt;_</span>
          <span>terminal</span>
        </button>
      </div>

      <div className="os-window" onClick={(e) => e.stopPropagation()}>
        <div className="os-window-titlebar">
          <span className="os-window-icon">{activeApp === 'files' ? '📁' : '▌'}</span>
          <span className="os-window-title">
            {activeApp === 'files' ? 'File Manager' : `${USERNAME}@kali: ~`}
          </span>
          <div className="os-window-controls">
            <span className="os-win-btn os-win-min" />
            <span className="os-win-btn os-win-max" />
            <button className="os-win-btn os-win-close" onClick={onClose} aria-label="Close" />
          </div>
        </div>
        <div className="os-window-body">
          {activeApp === 'files' ? <FilesApp /> : <TerminalApp />}
        </div>
      </div>
    </div>
  );
}
