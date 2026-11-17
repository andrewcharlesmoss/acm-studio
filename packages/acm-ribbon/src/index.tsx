"use client";

import { createContext, forwardRef, useContext, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";

export type RibbonSize = "compact" | "standard" | "large";
export type RibbonTabDefinition<T extends string = string> = { id: T; label: ReactNode; disabled?: boolean };

type PrefixProps = { prefix?: string; className?: string };
type RibbonProps<T extends string> = HTMLAttributes<HTMLElement> & PrefixProps & {
  tabs: readonly RibbonTabDefinition<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  brand?: ReactNode;
  status?: ReactNode;
  accessibleName?: string;
  children: ReactNode;
};
type RibbonContextValue = { prefix: string; instanceId: string; activeTab: string };
const RibbonContext = createContext<RibbonContextValue | null>(null);

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

type RibbonTabsProps<T extends string> = {
  tabs: readonly RibbonTabDefinition<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  accessibleName?: string;
};

export function RibbonTabs<T extends string>({ tabs, activeTab, onTabChange, accessibleName = "Ribbon" }: RibbonTabsProps<T>) {
  const context = useContext(RibbonContext);
  if (!context) throw new Error("RibbonTabs must be rendered inside Ribbon");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabId = (tab: T) => context.prefix + "-" + context.instanceId + "-tab-" + tab;
  const panelId = (tab: T) => context.prefix + "-" + context.instanceId + "-panel-" + tab;

  function focusTab(index: number) {
    const next = tabs[index];
    if (!next || next.disabled) return;
    onTabChange(next.id);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const requested = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + direction + tabs.length) % tabs.length;
    let next = requested;
    while (tabs[next]?.disabled && next !== index) next = (next + direction + tabs.length) % tabs.length;
    focusTab(next);
  }

  return <div className={context.prefix + "-tabs"} role="tablist" aria-label={accessibleName + " tabs"}>
    {tabs.map((tab, index) => <button ref={(element) => { tabRefs.current[index] = element; }} key={tab.id} id={tabId(tab.id)} type="button" role="tab" className={tab.id === activeTab ? "is-active" : undefined} aria-selected={tab.id === activeTab} aria-controls={panelId(tab.id)} tabIndex={tab.id === activeTab ? 0 : -1} disabled={tab.disabled} onClick={() => onTabChange(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)}>{tab.label}</button>)}
  </div>;
}

export function Ribbon<T extends string>({ tabs, activeTab, onTabChange, brand, status, accessibleName = "Ribbon", prefix = "acm-ribbon", className, children, ...props }: RibbonProps<T>) {
  const instanceId = useId().replace(/:/g, "");

  return <RibbonContext.Provider value={{ prefix, instanceId, activeTab }}><section className={classes(prefix, className)} aria-label={accessibleName} {...props}>
    {brand || status ? <div className={prefix + "-header"}><div className={prefix + "-brand"}>{brand}</div><div className={prefix + "-status"} aria-live="polite">{status}</div></div> : null}
    <RibbonTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} accessibleName={accessibleName} />
    <div className={prefix + "-content"}>{children}</div>
  </section></RibbonContext.Provider>;
}

export function RibbonGroup({ prefix = "acm-ribbon", label, className, children, ...props }: HTMLAttributes<HTMLDivElement> & PrefixProps & { label?: ReactNode }) {
  return <div className={classes(prefix + "-group", className)} {...props}><div className={prefix + "-group-controls"}>{children}</div>{label ? <span className={prefix + "-group-label"}>{label}</span> : null}</div>;
}

export function RibbonControls({ prefix = "acm-ribbon", className, children, ...props }: HTMLAttributes<HTMLDivElement> & PrefixProps) {
  return <div className={classes(prefix + "-controls", className)} {...props}>{children}</div>;
}

export const RibbonButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & PrefixProps & { size?: RibbonSize; active?: boolean }>(function RibbonButton({ prefix = "acm-ribbon", size = "standard", active = false, className, children, ...props }, ref) {
  const pressed = props["aria-pressed"] ?? (active ? "true" : undefined);
  return <button ref={ref} className={classes(prefix + "-button", prefix + "-button-" + size, active && "is-active", className)} type="button" aria-pressed={pressed} {...props}>{children}</button>;
});

export function RibbonToggleButton(props: ButtonHTMLAttributes<HTMLButtonElement> & PrefixProps & { size?: RibbonSize; pressed: boolean; active?: boolean }) {
  const { pressed, active = pressed, ...rest } = props;
  return <RibbonButton {...rest} active={active} aria-pressed={pressed} />;
}

export function RibbonField({ prefix = "acm-ribbon", className, children, ...props }: HTMLAttributes<HTMLLabelElement> & PrefixProps) {
  return <label className={classes(prefix + "-field", className)} {...props}>{children}</label>;
}

export function RibbonPanel({ prefix = "acm-ribbon", tab, active, className, children, ...props }: HTMLAttributes<HTMLDivElement> & PrefixProps & { tab?: string; active?: boolean }) {
  const context = useContext(RibbonContext);
  const effectivePrefix = context?.prefix ?? prefix;
  const effectiveActive = active ?? (tab ? context?.activeTab === tab : true);
  const id = props.id ?? (tab && context ? context.prefix + "-" + context.instanceId + "-panel-" + tab : undefined);
  const labelledBy = props["aria-labelledby"] ?? (tab && context ? context.prefix + "-" + context.instanceId + "-tab-" + tab : undefined);
  return <div className={classes(effectivePrefix + "-panel", className)} role="tabpanel" hidden={!effectiveActive} aria-hidden={!effectiveActive} tabIndex={effectiveActive ? 0 : -1} id={id} aria-labelledby={labelledBy} {...props}>{children}</div>;
}
