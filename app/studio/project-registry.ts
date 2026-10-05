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

const repository = (name: string): StudioProjectLink => ({
  label: "View Repository",
  href: `https://github.com/andrewcharlesmoss/${name}`,
});

// Studio owns display copy and available actions. Keep membership aligned with
// the active independent projects in workspace-governance/PROJECTS.json.
const projects: StudioProject[] = [
  { id: "acm-account", name: "ACM Account", description: "Shared identity and account management for ACM projects.", kind: "Application", links: [repository("acm-account")] },
  { id: "acm-icons", name: "ACM Icons", description: "Shared SVG symbols, keyboard artwork and icon catalogue.", kind: "Shared library", links: [{ label: "Open Icons", href: "/studio/ui/icons" }] },
  { id: "acm-panel", name: "ACM Panel", description: "Reusable panels for ACM interfaces.", kind: "Shared library", links: [{ label: "Open Panels", href: "/studio/ui/panels" }] },
  { id: "acm-ribbon", name: "ACM Ribbon", description: "Shared Ribbon layout, controls and keyboard navigation.", kind: "Shared library", links: [{ label: "Open Ribbon", href: "/studio/ui/ribbon" }] },
  { id: "acm-studio", name: "ACM Studio", description: "Content, templates, files and publishing tools across ACM projects.", kind: "Application", links: [{ label: "Open Studio", href: "/studio" }] },
  { id: "acm-styles", name: "ACM Styles", description: "Universal colours, typography, buttons and layout presets.", kind: "Shared library", links: [{ label: "Open Styles", href: "/studio/ui/styles" }] },
  { id: "andrew-moss", name: "Andrew Moss", description: "Personal site, writing, videos and work history.", kind: "Website", links: [{ label: "Visit Site", href: "https://andrewmoss.me/" }] },
  { id: "habit-tracker", name: "Habit Tracker", description: "Daily habits, progress and notes in a local-first tracker.", kind: "Website", links: [repository("habit-tracker")] },
  { id: "lid-angle", name: "Lid Angle", description: "A native macOS app for measuring a MacBook’s lid angle.", kind: "macOS app", links: [repository("lid-angle")] },
  { id: "loquafy", name: "Loquafy", description: "One-to-one social video and conversation.", kind: "Application", links: [repository("loquafy")] },
  { id: "loquafy-mark-lab", name: "Loquafy Mark Lab", description: "Explore and refine the geometry of the Loquafy mark.", kind: "Website", links: [repository("loquafy-mark-lab")] },
  { id: "loquage", name: "Loquage", description: "Browser-based visual age estimation and facial tracking.", kind: "Website", links: [repository("loquage")] },
  { id: "mini-golf-scorecard", name: "Mini Golf Scorecard", description: "Local scorekeeping, player ordering and shared game summaries.", kind: "Website", links: [], environments: miniGolfSites.map(site => ({
    id: site.id,
    name: site.environmentLabel,
    links: [{ label: "Visit Site", href: site.publicHref }, { label: "Edit Site", href: site.editorHref }],
  })).sort((left, right) => left.name.localeCompare(right.name, "en-GB")) },
  // Retain the existing planned entry alongside registered projects.
  { id: "mission-control", name: "Mission Control", description: "The wider operating system for projects and work.", kind: "Planned", links: [] },
  { id: "project-ports", name: "Project Ports", description: "Manage local development servers and their assigned ports.", kind: "macOS app", links: [repository("project-ports")] },
  { id: "workspace-governance", name: "Workspace Governance", description: "Shared project standards, documentation and review guidance.", kind: "Governance", links: [repository("workspace-governance")] },
];

export const studioProjects = projects.sort((left, right) => left.name.localeCompare(right.name, "en-GB"));
