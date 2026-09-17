export type SectionId = 'education' | 'experience' | 'projects' | 'skills' | 'contact';

export interface SectionMeta {
  id: SectionId;
  index: number;
  label: string;
  objectLabel: string;
  accent: string;
  level: 'cabin' | 'bunker';
}

export const SECTIONS: SectionMeta[] = [
  { id: 'education',  index: 0, label: 'Education',  objectLabel: 'Study Nook',   accent: '#f6b352', level: 'cabin' },
  { id: 'skills',     index: 1, label: 'Skills',      objectLabel: 'Server Racks', accent: '#7fd858', level: 'bunker' },
  { id: 'experience', index: 2, label: 'Experience',  objectLabel: 'Workbench',    accent: '#4fd1c5', level: 'bunker' },
  { id: 'projects',   index: 3, label: 'Projects',    objectLabel: 'The Case',    accent: '#e8494f', level: 'bunker' },
  { id: 'contact',    index: 4, label: 'Contact',     objectLabel: 'Terminal',    accent: '#c17fe0', level: 'bunker' },
];

export const PROFILE = {
  name: 'Ghayas Sher',
  location: 'Mississauga, ON',
  phone: '437-258-2244',
  email: 'sghayas12@gmail.com',
  github: 'github.com/Designer45',
  githubUrl: 'https://github.com/Designer45',
  tagline:
    'Networking & IT Security student building secure systems, analyzing data, and shipping software — currently grounded between the tarmac at YYZ and the books at Ontario Tech.',
};

export const EDUCATION = {
  school: 'Ontario Tech University',
  location: 'Oshawa, ON',
  program: 'BIT (Honours), Networking & IT Security',
  dates: 'Expected 2027',
  coursework: [
    'Computer Security', 'Cybercrime', 'Advanced Networking I & II', 'Cloud Services',
    'DevOps & Automation', 'IT Data Analytics', 'Statistics', 'Database Systems',
    'Web & Script Programming',
  ],
};

export interface ExperienceItem {
  role: string;
  org: string;
  location: string;
  dates: string;
  bullets: string[];
}

export const EXPERIENCE: ExperienceItem[] = [
  {
    role: 'Co-Founder',
    org: 'SSIK Inc.',
    location: 'Mississauga, ON',
    dates: 'May 2026 – Present',
    bullets: [
      'Identified security control gaps across a commercial client environment by assessing network configurations and device deployments against baseline security requirements.',
      'Reduced client regulatory exposure by researching Ontario privacy legislation and scoping data protection obligations the client had not accounted for.',
      'Enabled non-technical stakeholder decision-making by producing structured findings documentation translating technical risk into prioritized recommendations.',
    ],
  },
  {
    role: 'Ramp Agent',
    org: 'Swissport — Toronto Pearson International Airport (YYZ)',
    location: 'Mississauga, ON',
    dates: 'Ongoing',
    bullets: [
      'Maintain on-time aircraft turnaround performance in a safety-critical environment by executing strict procedural compliance and coordinating across ground, operations, and flight teams.',
    ],
  },
  {
    role: 'Community Coordinator (Volunteer)',
    org: 'Canadian Pakistani Public Community Association',
    location: 'Mississauga, ON',
    dates: '2023 – Present',
    bullets: [
      'Deliver community programs by coordinating logistics and communications across diverse stakeholder groups as first point of contact for inquiries and escalations.',
    ],
  },
];

export interface ProjectItem {
  name: string;
  year: string;
  stack: string;
  bullets: string[];
}

export const PROJECTS: ProjectItem[] = [
  {
    name: 'Healthcare Analytics Case Study',
    year: '2026',
    stack: 'SAS · Statistical Modelling · Data Visualization',
    bullets: [
      'Surfaced statistically significant operational trends across an organizational dataset by applying hypothesis testing, ANOVA, correlation, and regression analysis.',
      'Delivered stakeholder-ready recommendations by preprocessing raw structured data and producing visualizations of the findings.',
    ],
  },
  {
    name: 'Endpoint Compliance Automation',
    year: '2026',
    stack: 'Ansible · Puppet · NETCONF/RESTCONF · pyATS',
    bullets: [
      'Detected configuration drift across a managed device fleet by building automated workflows auditing live device state against defined security baselines.',
    ],
  },
  {
    name: 'GameScope',
    year: '2026',
    stack: 'Python · Flask · React · REST APIs · CI/CD · Git',
    bullets: [
      'Shipped a full-stack web application on schedule by owning the Flask backend, REST endpoints, and unit test coverage, deployed through an automated CI/CD pipeline.',
    ],
  },
  {
    name: 'Enterprise Network Security Architecture',
    year: '2025',
    stack: 'EIGRP · HSRP · MPLS · DMVPN · STP',
    bullets: [
      'Eliminated single points of failure across a three-site enterprise topology by designing segmentation, redundancy, and access control into the architecture and documenting all control decisions.',
    ],
  },
];

export interface SkillGroup {
  label: string;
  items: string;
}

export const SKILLS: SkillGroup[] = [
  {
    label: 'Security',
    items:
      'Threat research & analysis, security control assessment, risk identification, OWASP Top 10, vulnerability management, incident response fundamentals, log correlation concepts; NIST SP 800-53, NIST CSF, ISO 27000, PIPEDA-aligned data protection.',
  },
  {
    label: 'Data Analysis',
    items:
      'SAS (PROC SQL, SGPLOT, DATA steps), hypothesis testing, ANOVA, regression, data preprocessing & visualization, advanced Excel (pivot tables, formulas).',
  },
  {
    label: 'Languages & Databases',
    items: 'Python, SQL, JavaScript, HTML/CSS, Java, Bash; relational database concepts & design.',
  },
  {
    label: 'Tools',
    items: 'Git/GitHub, Flask, React, Ansible, Puppet, CI/CD, Microsoft 365, Windows & Linux/Unix.',
  },
  {
    label: 'Certifications (in progress)',
    items: 'ISC2 Certified in Cybersecurity (CC), CompTIA Security+.',
  },
  {
    label: 'Languages',
    items: 'English, Urdu, Pashto.',
  },
];

export const INTERESTS = ['Soccer', 'Reading', 'Gym', 'Racing sims', 'Travel', 'Building things by hand'];
