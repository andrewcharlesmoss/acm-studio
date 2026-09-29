export type IconSortOrder = "catalogue" | "newest" | "oldest";

export function sortIconsByAddedAt<Name extends string>(
  names: readonly Name[],
  addedAt: Readonly<Record<Name, string>>,
  order: IconSortOrder,
): Name[] {
  if (order === "catalogue") return [...names];

  const direction = order === "newest" ? -1 : 1;
  return names
    .map((name, catalogueIndex) => ({ name, catalogueIndex, timestamp: Date.parse(addedAt[name]) }))
    .sort((left, right) => direction * (left.timestamp - right.timestamp) || left.catalogueIndex - right.catalogueIndex)
    .map(({ name }) => name);
}

const addedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/London",
  timeZoneName: "short",
});

export function formatIconAddedAt(timestamp: string): string {
  return addedAtFormatter.format(new Date(timestamp));
}
