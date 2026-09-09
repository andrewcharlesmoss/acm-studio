export const miniGolfSite = {
  id: "mini-golf-scorecard",
  name: "Mini Golf Scorecard",
  description: "Page content and layout for the mini golf scorecard.",
  editorHref: "/studio/sites/mini-golf-scorecard",
  publicHref: "https://mini-golf-scorecard.andrewcharlesmoss.chatgpt.site/",
  environment: "prod",
  environmentLabel: "Production",
  hostingProjectId: "appgprj_6a806eb84b648191b3015d1b6b694c45",
} as const;

export const miniGolfStagingSite = {
  ...miniGolfSite,
  id: "mini-golf-scorecard-staging",
  name: "Mini Golf Scorecard Staging",
  environment: "staging",
  environmentLabel: "Staging",
  description: "Private staging site. Separate local page draft; shared Mini Golf source project.",
  editorHref: "/studio/sites/mini-golf-scorecard-staging",
  publicHref: "https://mini-golf-scorecard-staging.andrewcharlesmoss.chatgpt.site/",
  hostingProjectId: "appgprj_6a952fdb444c81918a35bc3fc6271c4a",
} as const;

export const miniGolfSites = [miniGolfStagingSite, miniGolfSite];
export type MiniGolfSite = typeof miniGolfSite | typeof miniGolfStagingSite;
