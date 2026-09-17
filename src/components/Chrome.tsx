import { PROFILE } from '../data/resume';

export default function Chrome() {
  return (
    <header className="brand">
      <span className="brand-mark">GS</span>
      <span className="brand-name">{PROFILE.name}</span>
    </header>
  );
}
