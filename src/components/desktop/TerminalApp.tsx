import { useEffect, useRef, useState } from 'react';
import { findNode, resolveArgPath, displayPath, type FSNode } from '../../data/filesystem';
import { PROFILE } from '../../data/resume';

const USERNAME = PROFILE.name.split(' ')[0].toLowerCase();
const HOSTNAME = 'kali';

type Entry =
  | { kind: 'command'; cwd: string[]; cmd: string }
  | { kind: 'output'; text: string };

function Prompt({ cwd }: { cwd: string[] }) {
  return (
    <span className="os-kp-ctx">
      <span className="os-kp-punc">┌──(</span>
      <span className="os-kp-user">{USERNAME}</span>
      <span className="os-kp-punc">㉿</span>
      <span className="os-kp-host">{HOSTNAME}</span>
      <span className="os-kp-punc">)-[</span>
      <span className="os-kp-path">{displayPath(cwd)}</span>
      <span className="os-kp-punc">]</span>
    </span>
  );
}

function runCommand(cwd: string[], raw: string): { cwd: string[]; output: string[]; clear?: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { cwd, output: [] };
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd) {
    case 'help':
      return {
        cwd,
        output: ['Commands: ls [path]  cd <path>  cat <file>  pwd  tree [path]  whoami  clear  help'],
      };
    case 'pwd':
      return { cwd, output: [displayPath(cwd)] };
    case 'whoami':
      return { cwd, output: [USERNAME] };
    case 'clear':
      return { cwd, output: [], clear: true };
    case 'ls': {
      const target = arg ? resolveArgPath(cwd, arg) : cwd;
      const node = target ? findNode(target) : null;
      if (!node) return { cwd, output: [`ls: ${arg}: no such file or directory`] };
      if (node.type === 'file') return { cwd, output: [node.name] };
      if (node.children.length === 0) return { cwd, output: ['(empty)'] };
      return { cwd, output: [node.children.map((c) => (c.type === 'folder' ? c.name + '/' : c.name)).join('  ')] };
    }
    case 'cd': {
      if (!arg || arg === '~') return { cwd: [], output: [] };
      const target = resolveArgPath(cwd, arg);
      const node = target ? findNode(target) : null;
      if (!node) return { cwd, output: [`cd: ${arg}: no such file or directory`] };
      if (node.type !== 'folder') return { cwd, output: [`cd: ${arg}: not a directory`] };
      return { cwd: target!, output: [] };
    }
    case 'cat': {
      if (!arg) return { cwd, output: ['cat: missing file operand'] };
      const target = resolveArgPath(cwd, arg);
      const node = target ? findNode(target) : null;
      if (!node) return { cwd, output: [`cat: ${arg}: no such file or directory`] };
      if (node.type === 'folder') return { cwd, output: [`cat: ${arg}: is a directory`] };
      return { cwd, output: node.content.split('\n') };
    }
    case 'tree': {
      const target = arg ? resolveArgPath(cwd, arg) : cwd;
      const node = target ? findNode(target) : null;
      if (!node) return { cwd, output: [`tree: ${arg}: no such file or directory`] };
      const lines: string[] = [];
      const walk = (n: FSNode, prefix: string) => {
        if (n.type === 'file') return;
        n.children.forEach((c, i) => {
          const last = i === n.children.length - 1;
          lines.push(prefix + (last ? '└── ' : '├── ') + c.name + (c.type === 'folder' ? '/' : ''));
          if (c.type === 'folder') walk(c, prefix + (last ? '    ' : '│   '));
        });
      };
      walk(node, '');
      return { cwd, output: lines.length ? lines : ['(empty)'] };
    }
    default:
      return { cwd, output: [`command not found: ${cmd} (try 'help')`] };
  }
}

export default function TerminalApp() {
  const [cwd, setCwd] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([
    { kind: 'output', text: `┌─[ ${USERNAME}@${HOSTNAME} ]─ workstation online` },
    { kind: 'output', text: "Type 'help' to see available commands." },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const cmdText = input;
    const ranAtCwd = cwd;
    const result = runCommand(cwd, cmdText);
    setCwd(result.cwd);
    if (result.clear) {
      setEntries([]);
    } else {
      setEntries((prev) => [
        ...prev,
        { kind: 'command', cwd: ranAtCwd, cmd: cmdText },
        ...result.output.map((text) => ({ kind: 'output' as const, text })),
      ]);
    }
    setInput('');
  };

  return (
    <div className="os-terminal" onClick={() => inputRef.current?.focus()}>
      <div className="os-terminal-scroll" ref={scrollRef}>
        {entries.map((e, i) =>
          e.kind === 'command' ? (
            <div key={i} className="os-term-block">
              <div className="os-term-line"><Prompt cwd={e.cwd} /></div>
              <div className="os-term-line os-term-cmdline">
                <span className="os-kp-dollar">└─$</span> {e.cmd}
              </div>
            </div>
          ) : (
            <div key={i} className="os-term-line os-term-output">{e.text}</div>
          )
        )}
        <div className="os-term-block">
          <div className="os-term-line"><Prompt cwd={cwd} /></div>
          <div className="os-term-line os-term-input-row">
            <span className="os-kp-dollar">└─$</span>
            <input
              ref={inputRef}
              className="os-term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
