import { AcmIcon } from "@acm/icons/react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { controlLibraryAttributes } from "./control-library-links";
import "./back-action.css";

type CommonProps = { label: string; className?: string };
type BackActionProps = CommonProps & (
  | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; disabled?: never })
  | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
);

/** Hosts own the destination or command; both native variants share one control. */
export function BackAction({ label, className, title, ...props }: BackActionProps) {
  const appearance = {
    ...controlLibraryAttributes("back-action"),
    className: `studio-back-action${className ? ` ${className}` : ""}`,
    "aria-label": label,
    title: title ?? label,
    children: <AcmIcon name="navigation.chevron-left" size={24} scale="Regular-M" aria-hidden="true" />,
  };
  return props.href !== undefined
    ? <a {...props as AnchorHTMLAttributes<HTMLAnchorElement>} {...appearance} />
    : <button type="button" {...props as ButtonHTMLAttributes<HTMLButtonElement>} {...appearance} />;
}
