import { EDUCATION, PROJECTS, SKILLS, PROFILE } from './resume';

export interface FSFile {
  type: 'file';
  name: string;
  content: string;
}

export interface FSFolder {
  type: 'folder';
  name: string;
  children: FSNode[];
}

export type FSNode = FSFile | FSFolder;

function file(name: string, content: string): FSFile {
  return { type: 'file', name, content };
}

function folder(name: string, children: FSNode[]): FSFolder {
  return { type: 'folder', name, children };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const courseworkFolders: FSFolder[] = EDUCATION.coursework.map((course) =>
  folder(slugify(course), [
    file(
      'README.md',
      [
        `# ${course}`,
        '',
        `Part of the ${EDUCATION.program} program at ${EDUCATION.school}.`,
        '',
        'Lab work and assignments for this course live in ./labs — drop new files in as they\'re completed.',
      ].join('\n')
    ),
    folder('labs', []),
  ])
);

const projectFolders: FSFolder[] = PROJECTS.map((p) =>
  folder(slugify(p.name), [
    file(
      'README.md',
      [
        `# ${p.name}`,
        '',
        `**Year:** ${p.year}`,
        `**Stack:** ${p.stack}`,
        '',
        ...p.bullets.map((b) => `- ${b}`),
      ].join('\n')
    ),
  ])
);

const contactTxt = [
  `Name:     ${PROFILE.name}`,
  `Location: ${PROFILE.location}`,
  `Email:    ${PROFILE.email}`,
  `Phone:    ${PROFILE.phone}`,
  `GitHub:   ${PROFILE.github}`,
  '',
  'Open to co-op, internship, and entry-level opportunities in security and networking.',
].join('\n');

export const ROOT: FSFolder = folder('~', [
  file(
    'README.md',
    [
      `# ${PROFILE.name}`,
      '',
      PROFILE.tagline,
      '',
      'Browse ./coursework for classes, ./projects for major builds, ./documentation for',
      'background info, or just `cat contact.txt`.',
    ].join('\n')
  ),
  file('contact.txt', contactTxt),
  folder('coursework', courseworkFolders),
  folder('projects', projectFolders),
  folder('documentation', [
    file(
      'about.md',
      [`# About`, '', PROFILE.tagline, '', `Based in ${PROFILE.location}.`].join('\n')
    ),
    file(
      'skills.md',
      ['# Skills', '', ...SKILLS.flatMap((s) => [`## ${s.label}`, s.items, ''])].join('\n')
    ),
    file(
      'resume.pdf',
      'Binary file — open with the Contact panel\'s download link, or visit /resume.pdf directly.'
    ),
  ]),
]);

/** cwd is a list of names from the root, e.g. [] = ~, ['coursework'] = ~/coursework */
export function findNode(segs: string[]): FSNode | null {
  let node: FSNode = ROOT;
  for (const seg of segs) {
    if (node.type !== 'folder') return null;
    const next: FSNode | undefined = node.children.find((c) => c.name === seg);
    if (!next) return null;
    node = next;
  }
  return node;
}

export function resolveFolder(cwd: string[]): FSFolder | null {
  const node = findNode(cwd);
  return node && node.type === 'folder' ? node : null;
}

export function displayPath(cwd: string[]): string {
  return cwd.length ? `~/${cwd.join('/')}` : '~';
}

/** Resolves a shell-style path arg (relative, "..", or "/"-absolute) against cwd. Returns null if it doesn't exist. */
export function resolveArgPath(cwd: string[], arg: string): string[] | null {
  const segs = arg.startsWith('/') ? [] : [...cwd];
  for (const part of arg.split('/').filter(Boolean)) {
    if (part === '.') continue;
    else if (part === '..') segs.pop();
    else segs.push(part);
  }
  return findNode(segs) ? segs : null;
}
