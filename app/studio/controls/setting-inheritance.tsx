"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { InheritedIndicator } from "./inherited-indicator";
import "./setting-inheritance.css";

export type SettingInheritance = Readonly<Record<string, boolean>>;
const InheritanceContext = createContext<SettingInheritance>({});
const key = (label: string) => label.toLowerCase().replace(/\s+/g, " ").trim();

/** Owners describe provenance; controls share its presentation without owning values. */
export function SettingInheritanceProvider({ values, children }: { values: SettingInheritance; children: ReactNode }) {
  const labels = Object.fromEntries(Object.entries(values).map(([label, inherited]) => [key(label), inherited]));
  return <InheritanceContext.Provider value={labels}>{children}</InheritanceContext.Provider>;
}
export function useSettingInherited(label: ReactNode) {
  const values = useContext(InheritanceContext);
  return typeof label === "string" && values[key(label)] === true;
}
export function SettingLabel({ children, inherited: override, inheritanceLabel, ...props }: ComponentProps<"span"> & { inherited?: boolean; inheritanceLabel?: string }) {
  const contextInherited = useSettingInherited(inheritanceLabel ?? children);
  const inherited = override ?? contextInherited;
  return <span {...props} className={[inherited ? "studio-setting-label" : undefined, props.className].filter(Boolean).join(" ") || undefined} data-inherited={inherited || undefined}>{children}{inherited ? <><InheritedIndicator /><span className="visually-hidden"> — Inherited</span></> : null}</span>;
}

export type SettingFieldDefinition = readonly string[] | { fields: readonly string[]; overrides?: readonly string[]; independent?: boolean };
/** Alternatives share ownership; independent fields retain their own provenance. */
export function inheritedSettingLabels(effective: object, authored: object, definitions: Readonly<Record<string, SettingFieldDefinition>>): SettingInheritance {
  return Object.fromEntries(Object.entries(definitions).map(([label, definition]) => {
    const fields = "fields" in definition ? definition.fields : definition;
    const independent = "independent" in definition && definition.independent;
    const overrides = "overrides" in definition ? definition.overrides ?? fields : fields;
    return [label, independent
      ? fields.some(field => Reflect.get(effective, field) !== undefined && Reflect.get(authored, field) === undefined)
      : fields.some(field => Reflect.get(effective, field) !== undefined) && overrides.every(field => Reflect.get(authored, field) === undefined)];
  }));
}
