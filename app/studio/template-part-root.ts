export function isTemplatePartRootGroup({
  blockId,
  parentId,
  rootBlockId,
  wrapperId,
}: {
  blockId: string;
  parentId: string | null;
  rootBlockId: string | null;
  wrapperId: string | null;
}): boolean {
  return Boolean(rootBlockId && blockId === rootBlockId) || Boolean(wrapperId && parentId === wrapperId);
}
