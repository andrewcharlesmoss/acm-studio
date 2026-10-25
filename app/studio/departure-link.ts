/** Own only same-tab departures; modifier clicks retain the browser's link behaviour. */
export function createDepartureLinkHandler(prepare: () => Promise<boolean>, navigate: (href: string) => void, onFailure: () => void = () => {}, pending = { current: false }) {
  return (event: { defaultPrevented: boolean; button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; preventDefault(): void; stopPropagation(): void }, link: { href: string; target: string; hasAttribute(name: string): boolean } | null) => {
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    event.preventDefault(); event.stopPropagation();
    if (pending.current) return;
    pending.current = true;
    void Promise.resolve().then(prepare).then(allowed => { if (allowed) navigate(link.href); }).catch(onFailure).finally(() => { pending.current = false; });
  };
}
