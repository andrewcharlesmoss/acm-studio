export function quoteCitationIsVisible(block, localVisibility = false) {
  return Boolean(block.attribution) || localVisibility === true;
}

export function toggleQuoteCitation(block, localVisibility = false) {
  if (quoteCitationIsVisible(block, localVisibility)) {
    return {
      visible: false,
      focus: false,
      block: { ...block, attribution: undefined, attributionRuns: undefined },
    };
  }

  return { visible: true, focus: true, block };
}
