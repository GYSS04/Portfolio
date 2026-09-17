import { useState, useCallback } from 'react';
import Experience from './components/Experience';
import ContentPanel from './components/ContentPanel';
import LinuxDesktop from './components/desktop/LinuxDesktop';
import Chrome from './components/Chrome';
import Loader from './components/Loader';
import type { SectionId } from './data/resume';

export default function App() {
  const [ready, setReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  const handleSelect = useCallback((id: SectionId) => setOpenSection(id), []);
  const handleClose = useCallback(() => setOpenSection(null), []);

  return (
    <div className="app">
      <Loader ready={ready} progress={loadProgress} />
      <Experience
        openSection={openSection}
        onSelect={handleSelect}
        onLoadProgress={setLoadProgress}
        onReady={() => setReady(true)}
      />
      <Chrome />
      {openSection === 'contact' ? (
        <LinuxDesktop onClose={handleClose} />
      ) : (
        <ContentPanel sectionId={openSection} onClose={handleClose} />
      )}
    </div>
  );
}
