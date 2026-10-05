import { miniGolfSites } from "./site-registry";

export type StudioProjectLink = { label: string; href: string };
export type StudioProject = {
  id: string;
  name: string;
  description: string;
  kind: string;
  links: StudioProjectLink[];
  environments?: { id: string; name: string; links: StudioProjectLink[] }[];
};

const visitSite = (href: string): StudioProjectLink => ({ label: "Visit Site", href });
const environment = (id: string, name: "Production" | "Staging", href: string) => ({
  id, name, links: [visitSite(href)],
});

// Studio owns this directory of actual sites. URLs and staging environments were
// checked against Sites metadata on 5 October 2026; library packages and projects
// without a hosted site belong in their existing tools, not this directory.
const projects: StudioProject[] = [
  { id: "acm-account", name: "ACM Account", description: "Shared identity and account management for ACM projects.", kind: "Website", links: [], environments: [
    environment("acm-account", "Production", "https://acm-account.andrewcharlesmoss.chatgpt.site"),
    environment("acm-account-staging", "Staging", "https://acm-account-staging.andrewcharlesmoss.chatgpt.site"),
  ] },
  { id: "acm-studio", name: "ACM Studio", description: "Content, templates, files and publishing tools across ACM projects.", kind: "Website", links: [
    visitSite("https://acm-studio.andrewcharlesmoss.chatgpt.site"),
    { label: "Open Studio", href: "/studio" },
  ] },
  { id: "andrew-moss", name: "Andrew Moss", description: "Personal site, writing, videos and work history.", kind: "Website", links: [visitSite("https://andrewmoss.me/")] },
  { id: "habit-tracker", name: "Habit Tracker", description: "Daily habits, progress and notes in a local-first tracker.", kind: "Website", links: [], environments: [
    environment("habit-tracker", "Production", "https://habit-tracker.andrewcharlesmoss.chatgpt.site"),
    environment("habit-tracker-staging", "Staging", "https://habit-tracker-staging.andrewcharlesmoss.chatgpt.site"),
  ] },
  { id: "lid-angle", name: "Lid Angle", description: "The website for the MacBook lid-angle app.", kind: "Website", links: [visitSite("https://lid-angle.andrewcharlesmoss.chatgpt.site")] },
  { id: "loquafy", name: "Loquafy", description: "One-to-one social video and conversation.", kind: "Website", links: [], environments: [
    environment("loquafy", "Production", "https://loquafy.com"),
    environment("loquafy-staging", "Staging", "https://staging.loquafy.com"),
  ] },
  { id: "loquage", name: "Loquage", description: "Browser-based visual age estimation and facial tracking.", kind: "Website", links: [visitSite("https://loquage.andrewcharlesmoss.chatgpt.site")] },
  { id: "mini-golf-scorecard", name: "Mini Golf Scorecard", description: "Local scorekeeping, player ordering and shared game summaries.", kind: "Website", links: [], environments: miniGolfSites.map(site => ({
    id: site.id,
    name: site.environmentLabel,
    links: [visitSite(site.publicHref), { label: "Edit Site", href: site.editorHref }],
  })).sort((left, right) => left.name.localeCompare(right.name, "en-GB")) },
];

export const studioProjects = projects.sort((left, right) => left.name.localeCompare(right.name, "en-GB"));
