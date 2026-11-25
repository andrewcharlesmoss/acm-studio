type DialogPointer = Pick<MouseEvent, "target" | "currentTarget" | "clientX" | "clientY"> & {
  currentTarget: HTMLDialogElement;
};

export function isStudioDialogBackdropPoint(event: DialogPointer): boolean {
  if (event.target !== event.currentTarget) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
}

export function isStudioDialogBackdropClick(event: DialogPointer & Pick<MouseEvent, "detail">, closeOnBackdrop: boolean, closeDisabled: boolean): boolean {
  return closeOnBackdrop && !closeDisabled && event.detail > 0 && isStudioDialogBackdropPoint(event);
}
