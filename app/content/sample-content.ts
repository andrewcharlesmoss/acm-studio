import type { Article, Project } from "./model";

export const projects: Project[] = [
  {
    slug: "loquafy",
    name: "Loquafy",
    eyebrow: "Social connection",
    summary: "A one-to-one social video and conversation product built around meaningful human connection.",
    description:
      "Loquafy explores how thoughtful matching, clear safety boundaries and carefully integrated AI can make starting a conversation feel easier without replacing the people at its centre.",
    status: "Active",
    year: "2025 — now",
    url: "https://loquafy.com",
    accent: "#4169e1",
    tags: ["Product design", "Video", "Conversation", "Safety"],
    highlights: [
      "Human-first one-to-one matching",
      "Designed for low-friction conversation",
      "Integrated administration and safety controls",
    ],
  },
  {
    slug: "loquage",
    name: "Loquage",
    eyebrow: "Facial AI experiments",
    summary: "Browser-based experiments in facial tracking, expression and human-to-avatar interaction.",
    description:
      "Loquage is an exploratory lab for understanding what real-time facial signals can enable in the browser, with attention to responsiveness, consent and clear user control.",
    status: "Exploring",
    year: "2026",
    accent: "#8c5bb8",
    tags: ["Computer vision", "Browser", "Avatars", "Research"],
    highlights: [
      "Real-time browser facial tracking",
      "Raw and interpreted visual modes",
      "Experiments with authorised social proxies",
    ],
  },
  {
    slug: "lid-angle",
    name: "Lid Angle",
    eyebrow: "Mac utility",
    summary: "A focused native utility for finding the exact angle of a MacBook display.",
    description:
      "Lid Angle turns a surprisingly specific observation into a small, direct utility. It reflects a preference for tools that do one thing clearly and explain the result.",
    status: "Available",
    year: "2026",
    accent: "#0d8f79",
    tags: ["macOS", "Utility", "Sensors", "Native"],
    highlights: [
      "Live angle measurement",
      "Purposeful native presentation",
      "A narrow problem solved without unnecessary controls",
    ],
  },
  {
    slug: "mini-golf-scorecard",
    name: "Mini Golf Scorecard",
    eyebrow: "Small web product",
    summary: "A quick, mobile-first scorecard for groups playing a round of mini golf.",
    description:
      "The scorecard is a compact exploration of touch-friendly interaction, useful exports and keeping a social activity moving without turning it into data entry.",
    status: "Prototype",
    year: "2026",
    accent: "#d56d38",
    tags: ["Mobile", "Scorekeeping", "Interaction", "Export"],
    highlights: [
      "Fast per-player score entry",
      "Clear standings throughout a round",
      "Image and spreadsheet export experiments",
    ],
  },
];

export const articles: Article[] = [
  {
    slug: "find-exact-angle-macbook-lid",
    title: "Find out the exact angle of your MacBook lid",
    summary:
      "A small observation in the Apple Store became a focused experiment in measuring display angle accurately.",
    publishedAt: "2026-06-24",
    displayDate: "24 June 2026",
    readingTime: "2 minute read",
    section: "Technology",
    projectSlug: "lid-angle",
    blocks: [
      {
        id: "lid-intro",
        type: "paragraph",
        text: "Walk into an Apple Store and you may notice something subtle about the MacBooks on display: their lids are positioned with unusual consistency. That observation prompted a simple question — can a Mac tell you its exact display angle?",
      },
      {
        id: "lid-heading",
        type: "heading",
        level: 2,
        text: "From observation to utility",
      },
      {
        id: "lid-body",
        type: "paragraph",
        text: "The useful product is not the sensor reading alone. It is the interpretation, calibration and presentation that turn that reading into something understandable at a glance.",
      },
      {
        id: "lid-quote",
        type: "quote",
        text: "The most satisfying utilities often begin with a very narrow question.",
      },
    ],
  },
  {
    slug: "pressure-testing-code-with-multiple-llms",
    title: "Pressure-testing code with multiple LLMs",
    summary:
      "Why independent challenges are useful when code looks correct but the cost of being wrong is still high.",
    publishedAt: "2026-05-15",
    displayDate: "15 May 2026",
    readingTime: "3 minute read",
    section: "Technology",
    blocks: [
      {
        id: "llm-intro",
        type: "paragraph",
        text: "A passing test suite is evidence, but it is not proof that the right problem was solved. Asking a second model to challenge assumptions can expose gaps that implementation-focused work misses.",
      },
      {
        id: "llm-list",
        type: "list",
        style: "unordered",
        items: [
          "Give the reviewer the original requirement, not only the patch.",
          "Ask for concrete failure modes and evidence.",
          "Separate confirmed defects from plausible concerns.",
        ],
      },
      {
        id: "llm-body",
        type: "paragraph",
        text: "The aim is not consensus for its own sake. It is to make important assumptions visible before they become expensive decisions.",
      },
    ],
  },
  {
    slug: "add-line-breaks-custom-formats",
    title: "Add line breaks in custom formats",
    summary:
      "A compact Excel technique for displaying values across more than one line without changing the underlying data.",
    publishedAt: "2026-04-08",
    displayDate: "8 April 2026",
    readingTime: "1 minute read",
    section: "Excel",
    blocks: [
      {
        id: "excel-intro",
        type: "paragraph",
        text: "Custom formatting is a useful way to control how values are displayed, but formats are usually thought of as sitting on one line. A line break can make compact displays much easier to scan.",
      },
      {
        id: "excel-code",
        type: "code",
        language: "excel",
        code: "Home 0\nAway 0",
      },
      {
        id: "excel-note",
        type: "paragraph",
        text: "The value remains available for calculation; only its presentation changes.",
      },
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getArticlesForProject(slug: string) {
  return articles.filter((article) => article.projectSlug === slug);
}
