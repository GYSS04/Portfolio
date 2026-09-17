import { useMemo, useState } from 'react';
import { ROOT, findNode, resolveFolder, resolveArgPath, displayPath, type FSNode, type FSFolder } from '../../data/filesystem';

function pathKey(path: string[]): string {
  return path.join('/');
}

function TreeNode({
  node,
  path,
  expanded,
  onToggle,
  selectedPath,
  onSelectFolder,
}: {
  node: FSNode;
  path: string[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  selectedPath: string[];
  onSelectFolder: (path: string[]) => void;
}) {
  if (node.type === 'file') {
    return <div className="os-tree-file">📄 {node.name}</div>;
  }
  const key = pathKey(path);
  const isOpen = expanded.has(key) || path.length === 0;
  const isSelected = pathKey(selectedPath) === key;
  return (
    <div className="os-tree-node">
      <button
        className={`os-tree-folder${isSelected ? ' selected' : ''}`}
        onClick={() => {
          onToggle(key);
          onSelectFolder(path);
        }}
      >
        <span className="os-tree-caret">{isOpen ? '▾' : '▸'}</span>
        📁 {node.name}
      </button>
      {isOpen && (
        <div className="os-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.name}
              node={child}
              path={[...path, child.name]}
              expanded={expanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const BOOKMARKS = ['coursework', 'projects', 'documentation'];

export default function FilesApp() {
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string[] | null>(null);
  const [history, setHistory] = useState<string[][]>([[]]);
  const [addressInput, setAddressInput] = useState('~');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const navigateTo = (path: string[]) => {
    setSelectedPath(path);
    setSelectedFile(null);
    setAddressInput(displayPath(path));
    setHistory((prev) => [...prev, path]);
  };

  const handleSelectFolder = (path: string[]) => navigateTo(path);

  const goUp = () => {
    if (selectedPath.length === 0) return;
    navigateTo(selectedPath.slice(0, -1));
  };
  const goHome = () => navigateTo([]);
  const goBack = () => {
    if (history.length < 2) return;
    const prevHistory = history.slice(0, -1);
    setHistory(prevHistory);
    const target = prevHistory[prevHistory.length - 1];
    setSelectedPath(target);
    setSelectedFile(null);
    setAddressInput(displayPath(target));
  };

  const handleAddressSubmit = () => {
    const absolute = '/' + addressInput.replace(/^~\/?/, '');
    const target = resolveArgPath(selectedPath, absolute);
    if (target && resolveFolder(target)) navigateTo(target);
    else setAddressInput(displayPath(selectedPath));
  };

  const currentFolder: FSFolder | null = useMemo(() => resolveFolder(selectedPath), [selectedPath]);
  const fileNode = selectedFile ? findNode(selectedFile) : null;

  return (
    <div className="os-files">
      <div className="os-files-toolbar">
        <button className="os-toolbar-btn" onClick={goBack} disabled={history.length < 2} title="Back">◀</button>
        <button className="os-toolbar-btn" onClick={goUp} disabled={selectedPath.length === 0} title="Up">▲</button>
        <button className="os-toolbar-btn" onClick={goHome} title="Home">⌂</button>
        <input
          className="os-address-bar"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && handleAddressSubmit()}
        />
      </div>

      <div className="os-files-body">
        <aside className="os-files-tree">
          <div className="os-sidebar-header">Places</div>
          {BOOKMARKS.map((name) => (
            <button key={name} className="os-bookmark" onClick={() => navigateTo([name])}>
              ⭐ {name}
            </button>
          ))}
          <div className="os-sidebar-header">Devices</div>
          <TreeNode
            node={ROOT}
            path={[]}
            expanded={expanded}
            onToggle={toggle}
            selectedPath={selectedPath}
            onSelectFolder={handleSelectFolder}
          />
        </aside>

        <section className="os-files-view">
          {fileNode && fileNode.type === 'file' ? (
            <div className="os-file-content">
              {fileNode.name === 'resume.pdf' ? (
                <a href="/resume.pdf" target="_blank" rel="noopener" className="os-resume-link">
                  ↓ Download resume.pdf
                </a>
              ) : (
                <pre>{fileNode.content}</pre>
              )}
            </div>
          ) : currentFolder ? (
            <div className="os-files-grid">
              {currentFolder.children.length === 0 && <p className="os-empty">This folder is empty.</p>}
              {currentFolder.children.map((child) => (
                <button
                  key={child.name}
                  className="os-file-tile"
                  onClick={() => {
                    if (child.type === 'folder') {
                      navigateTo([...selectedPath, child.name]);
                      toggle(pathKey([...selectedPath, child.name]));
                    } else {
                      setSelectedFile([...selectedPath, child.name]);
                    }
                  }}
                >
                  <span className="os-file-tile-icon">{child.type === 'folder' ? '📁' : '📄'}</span>
                  <span className="os-file-tile-name">{child.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="os-empty">Not found.</p>
          )}
        </section>
      </div>

      <div className="os-files-statusbar">
        {fileNode ? displayPath(selectedFile!) : `${currentFolder?.children.length ?? 0} items — ${displayPath(selectedPath)}`}
      </div>
    </div>
  );
}
