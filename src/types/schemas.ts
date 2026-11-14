// Shared data shapes for the auto-apply side project.
// Rule: both of you code against these. Change them only after telling each other.
// Dates are ISO 8601 strings. IDs are strings (uuid or db id).

// ---------- Feature 1: Resume ----------

export interface ParsedResume {
  id: string;
  userId: string;
  label: string;              // e.g. "Base resume", "Tailored - Acme SWE Intern"
  baseResumeId: string | null; // null for the original upload, else the resume it was tailored from
  createdAt: string;
  rawText: string;            // full extracted text, kept for re-parsing / LLM prompts

  contact: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    links: { type: "linkedin" | "github" | "portfolio" | "other"; url: string }[];
  };

  summary?: string;

  education: {
    school: string;
    degree: string;           // "BSc Computer Engineering"
    startDate?: string;       // "2024-08"
    endDate?: string;         // "2028-05" or null if ongoing
    gpa?: string;
    highlights: string[];
  }[];

  skills: {
    technical: string[];      // normalised lowercase, e.g. "javascript", "pytorch"
    tools: string[];          // "git", "docker", "figma"
    soft: string[];
  };

  experience: {
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;         // null = current
    bullets: string[];        // one achievement per string; feature 3 rewrites these
  }[];

  projects: {
    name: string;
    description?: string;
    techStack: string[];
    bullets: string[];
    url?: string;
  }[];

  certifications: string[];
}

// ---------- Feature 2: Job ----------

export interface Job {
  id: string;                 // our internal id
  source: string;             // "adzuna" | "greenhouse" | "lever" | "manual" ...
  sourceId: string;           // id in that source, used to avoid duplicates
  title: string;
  company: string;
  location: string;
  remote: "onsite" | "hybrid" | "remote" | "unknown";
  type: "internship" | "full-time" | "part-time" | "contract" | "unknown";
  description: string;        // plain text. Strip HTML (MyCareersFuture). Adzuna may be a truncated snippet.
  requirements?: string[];    // neither source provides this; fill via LLM extraction
  skills: string[];           // employer-tagged and/or extracted. MUST be normalised with the same
                              // function as ParsedResume.skills (lowercase + alias map: "js" -> "javascript")
  categories?: string[];      // e.g. "Information Technology"
  durationMonths?: number;    // usually only available by extracting from the description
  salary?: {
    min?: number;
    max?: number;
    currency: string;         // "SGD"
    period: "month" | "year" | "hour" | "unknown";
  };
  minYearsExperience?: number;
  vacancies?: number;
  companyUen?: string;        // MyCareersFuture only
  postedAt?: string;
  expiresAt?: string;         // warn in the review queue if this has passed
  applyUrl: string;           // where the human finally submits (MCF job page / Adzuna redirect_url)
  raw?: unknown;              // original API payload, for debugging mapping issues
}

// Dedupe key: `${source}:${sourceId}`. Also dedupe across sources by normalised title + company.

export interface SearchQuery {
  keywords: string[];
  location?: string;
  type?: Job["type"];
  remote?: Job["remote"];
  fromResumeId?: string;      // if set, keywords were derived from this resume
}

export interface MatchResult {
  jobId: string;
  resumeId: string;
  score: number;              // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];          // short human-readable "why this matched"
}

// ---------- Feature 3: Fix suggestions ----------

export interface FixSuggestion {
  jobId: string;
  resumeId: string;
  createdAt: string;
  missingKeywords: { keyword: string; importance: "high" | "medium" | "low"; tip: string }[];
  bulletRewrites: {
    section: "experience" | "projects";
    itemIndex: number;        // index into ParsedResume.experience / projects
    bulletIndex: number;
    original: string;
    suggested: string;
    reason: string;
  }[];
  overallNote: string;        // 1-2 sentence summary
  tailoredResumeId?: string;  // set if user accepted and we saved a tailored copy
  coverLetter?: string;
}

// ---------- Feature 4: Application + human review ----------

export type ApplicationStatus = "saved" | "prepared" | "reviewed" | "submitted" | "rejected" | "interview";

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;           // the exact resume version being sent
  status: ApplicationStatus;
  prepared?: {
    coverLetter?: string;
    answers: { question: string; answer: string }[]; // pre-filled form answers
  };
  reviewedAt?: string;        // MUST be set before status can become "submitted"
  submittedAt?: string;
  notes?: string;
  updatedAt: string;
}

// Rule enforced in code: status may only move to "submitted" if reviewedAt is set,
// and only the user clicking confirm can set reviewedAt. That is feature 4.

// ---------- Mock data so Person B can start before Person A is done ----------

export const mockResume: ParsedResume = {
  id: "res_1",
  userId: "user_1",
  label: "Base resume",
  baseResumeId: null,
  createdAt: "2026-11-14T08:00:00Z",
  rawText: "Alex Tan ... (full text here)",
  contact: {
    name: "Alex Tan",
    email: "alex@example.com",
    location: "Singapore",
    links: [{ type: "github", url: "https://github.com/alextan" }],
  },
  education: [
    {
      school: "Example University",
      degree: "BSc Computer Engineering",
      startDate: "2024-08",
      highlights: ["Dean's List"],
    },
  ],
  skills: {
    technical: ["python", "c", "javascript", "pytorch"],
    tools: ["git", "linux"],
    soft: ["Teamwork"],
  },
  experience: [
    {
      company: "Startup Pte Ltd",
      title: "Embedded AI Intern",
      startDate: "2026-06",
      bullets: [
        "Deployed image classification models on a microcontroller",
        "Reduced model size by 40% using quantization",
      ],
    },
  ],
  projects: [
    {
      name: "Plant care app",
      techStack: ["Vue", "Firebase"],
      bullets: ["Built a web app for neighbours to share plant care"],
    },
  ],
  certifications: [],
};

export const mockJob: Job = {
  id: "job_1",
  source: "manual",
  sourceId: "demo-1",
  title: "Machine Learning Intern",
  company: "Acme AI",
  location: "Singapore",
  remote: "hybrid",
  type: "internship",
  description: "Work on ML models for edge devices. Requires Python, PyTorch, ONNX and Docker...",
  requirements: ["Python", "PyTorch", "ONNX", "Docker", "Understanding of model optimisation"],
  skills: ["python", "pytorch", "onnx", "docker"],
  categories: ["Information Technology"],
  durationMonths: 6,
  salary: { min: 1000, max: 1500, currency: "SGD", period: "month" },
  applyUrl: "https://example.com/apply/123",
};

export const mockMatch: MatchResult = {
  jobId: "job_1",
  resumeId: "res_1",
  score: 72,
  matchedSkills: ["python", "pytorch"],
  missingSkills: ["onnx", "docker"],
  reasons: ["Edge deployment experience matches the role", "Core ML stack overlaps"],
};
