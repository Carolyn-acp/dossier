// Single skills normaliser. Use it for BOTH ParsedResume.skills and Job.skills so matching works.

const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  ml: 'machine learning',
  ai: 'artificial intelligence',
  dl: 'deep learning',
  nlp: 'natural language processing',
  cv: 'computer vision',
  'node.js': 'node',
  nodejs: 'node',
  'react.js': 'react',
  reactjs: 'react',
  'vue.js': 'vue',
  vuejs: 'vue',
  golang: 'go',
  postgres: 'postgresql',
  k8s: 'kubernetes',
  'c++': 'cpp',
  'c#': 'csharp',
}

export function normaliseSkill(skill: string): string {
  const s = skill.trim().toLowerCase().replace(/\s+/g, ' ')
  return ALIASES[s] ?? s
}

/** Normalises, drops empties, and de-duplicates (order preserved). */
export function normaliseSkills(skills: readonly string[]): string[] {
  return [...new Set(skills.map(normaliseSkill).filter(Boolean))]
}
