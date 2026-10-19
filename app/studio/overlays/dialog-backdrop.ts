type DialogClick = Pick<MouseEvent, "target" | "currentTarget" | "detail" | "clientX" | "clientY"> & {
  currentTarget: HTMLDialogElement;
};

export function isStudioDialogBackdropClick(event: DialogClick, closeOnBackdrop: boolean, closeDisabled: boolean): boolean {
  if (!closeOnBackdrop || closeDisabled || event.target !== event.currentTarget || event.detail === 0) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
}
