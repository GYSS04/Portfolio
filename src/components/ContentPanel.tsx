import { SECTIONS, EDUCATION, EXPERIENCE, PROJECTS, SKILLS, PROFILE, type SectionId } from '../data/resume';

interface ContentPanelProps {
  sectionId: SectionId | null;
  onClose: () => void;
}

export default function ContentPanel({ sectionId, onClose }: ContentPanelProps) {
  if (!sectionId) return null;
  const meta = SECTIONS.find((s) => s.id === sectionId)!;

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside
        className="panel"
        style={{ '--panel-accent': meta.accent } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="panel-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <p className="panel-eyebrow">{meta.objectLabel}</p>

        {sectionId === 'education' && (
          <>
            <h2>Education</h2>
            <h3>{EDUCATION.school}</h3>
            <p className="panel-meta">{EDUCATION.program} · {EDUCATION.location} · {EDUCATION.dates}</p>
            <p className="panel-body">
              <strong>Coursework:</strong> {EDUCATION.coursework.join(', ')}.
            </p>
          </>
        )}

        {sectionId === 'experience' && (
          <>
            <h2>Experience</h2>
            <div className="panel-cards">
              {EXPERIENCE.map((item) => (
                <article key={item.role} className="panel-card">
                  <div className="panel-card-head">
                    <h3>{item.role}</h3>
                    <span className="panel-date">{item.dates}</span>
                  </div>
                  <p className="panel-org">{item.org} · {item.location}</p>
                  <ul>{item.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                </article>
              ))}
            </div>
          </>
        )}

        {sectionId === 'projects' && (
          <>
            <h2>The Case</h2>
            <p className="panel-meta">CASE #001 · OBJECTIVE: LAND THE INTERNSHIP</p>
            <p className="panel-body">Every piece of evidence pinned below is a project built — or in progress — to close the case.</p>
            <div className="panel-cards">
              {PROJECTS.map((item, i) => (
                <article key={item.name} className="panel-card">
                  <div className="panel-card-head">
                    <h3>Evidence #{i + 1}: {item.name}</h3>
                    <span className="panel-date">{item.year}</span>
                  </div>
                  <p className="panel-org">{item.stack}</p>
                  <ul>{item.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                </article>
              ))}
            </div>

            <p className="panel-eyebrow" style={{ marginTop: 24 }}>Tip line — reach the investigator</p>
            <div className="panel-contact-list">
              <a href={`mailto:${PROFILE.email}`} className="panel-contact-item">
                <span className="label">Email</span><span className="value">{PROFILE.email}</span>
              </a>
              <a href={`tel:+1${PROFILE.phone.replace(/-/g, '')}`} className="panel-contact-item">
                <span className="label">Phone</span><span className="value">{PROFILE.phone}</span>
              </a>
              <a href={PROFILE.githubUrl} target="_blank" rel="noopener" className="panel-contact-item">
                <span className="label">GitHub</span><span className="value">{PROFILE.github}</span>
              </a>
              <a href="/resume.pdf" target="_blank" rel="noopener" className="panel-contact-item panel-download">
                <span className="label">Resume</span><span className="value">Download PDF ↓</span>
              </a>
            </div>
          </>
        )}

        {sectionId === 'skills' && (
          <>
            <h2>Skills</h2>
            <div className="panel-skills">
              {SKILLS.map((group) => (
                <div key={group.label} className="panel-skill-group">
                  <h4>{group.label}</h4>
                  <p>{group.items}</p>
                </div>
              ))}
            </div>
          </>
        )}

      </aside>
    </div>
  );
}
