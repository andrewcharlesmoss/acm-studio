"use client";

import { useState, type MouseEvent } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "../studio-icons";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { StudioButton } from "../controls/button";
import { TextInput } from "../controls/native-fields";
import type { SiteNavigationMenu } from "../test-site/contract";
import { NavigationReviewDialog } from "./navigation-review-dialog";
import "./navigation-overview.css";

/** Site-owned named menus; the host supplies authority, assignment and persistence. */
export function NavigationOverview({ siteName, ready, error, menus = [], defaultMenuId, reviewPending = false, onReviewSaved, onOpen, onRetry, onSelect, onCreate, onRename, onDuplicate, onDelete }: {
  siteName: string; ready: boolean; error?: string | null; menus?: SiteNavigationMenu[]; defaultMenuId?: string;
  reviewPending?: boolean; onReviewSaved?: () => Promise<void>;
  onOpen: (menuId?: string) => void; onRetry?: () => void; onSelect?: (menuId: string) => void;
  onCreate?: () => boolean; onRename?: (menuId: string, name: string) => boolean; onDuplicate?: (menuId: string) => boolean; onDelete?: (menuId: string) => boolean;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [dialog, setDialog] = useState<{ kind: "rename" | "delete"; menu: SiteNavigationMenu } | null>(null);
  const [name, setName] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewOpener, setReviewOpener] = useState<HTMLElement | null>(null);
  const hasManagedMenus = menus.length > 0;
  const closeMenu = (restoreFocus = true) => { setOpenMenuId(null); if (restoreFocus) anchor?.focus(); };
  function openActions(event: MouseEvent<HTMLButtonElement>, menu: SiteNavigationMenu) {
    event.stopPropagation(); setAnchor(event.currentTarget); setOpenMenuId(current => current === menu.id ? null : menu.id);
  }
  function action(menu: SiteNavigationMenu, kind: "rename" | "delete") {
    closeMenu(false); setName(menu.name); setOperationError(null); setDialog({ kind, menu });
  }
  function runOperation(operation: () => boolean | undefined) {
    setOperationError(null);
    try { if (operation() === false) setOperationError("The navigation menu could not be changed. Your draft has been kept."); }
    catch (reason) { setOperationError(reason instanceof Error ? reason.message : "The navigation menu could not be changed. Your draft has been kept."); }
  }
  function submitDialog() {
    if (!dialog) return;
    let accepted = false;
    try { accepted = dialog.kind === "rename" ? onRename?.(dialog.menu.id, name.trim()) ?? false : onDelete?.(dialog.menu.id) ?? false; }
    catch (reason) { setOperationError(reason instanceof Error ? reason.message : "The navigation menu could not be changed. Your draft has been kept."); return; }
    if (!accepted) { setOperationError("The navigation menu could not be changed. Your draft has been kept."); return; }
    if (accepted) {
      const deleted = dialog.kind === "delete";
      setDialog(null);
      if (deleted) requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".site-navigation-overview .site-navigation-overview-entry")?.focus());
    }
  }
  const entry = (menu: SiteNavigationMenu) => <div className="site-navigation-menu-row" key={menu.id}>
    <button type="button" className="site-navigation-overview-entry" disabled={!ready || Boolean(error)} onClick={() => { onSelect?.(menu.id); onOpen(menu.id); }}>
      <AcmIcon name="navigation.compass" scale="Regular-M" size={24} />
      <span><strong>{menu.name}</strong><small>{menu.links.length} {menu.links.length === 1 ? "link" : "links"}{menu.id === defaultMenuId ? " · Default" : ""}</small></span>
      <StudioIcon name="chevron-right" size={18} />
    </button>
    {menus.length > 1 ? <>
      <button ref={openMenuId === menu.id ? setAnchor : undefined} type="button" className="site-navigation-menu-actions" aria-label={`Actions for ${menu.name}`} title="Actions" aria-haspopup="menu" aria-expanded={openMenuId === menu.id} disabled={!ready || Boolean(error)} onClick={event => openActions(event, menu)}><StudioIcon name="more-vertical" size={20} /></button>
      {openMenuId === menu.id && anchor ? <StudioAnchoredMenu anchor={() => anchor} aria-label={`${menu.name} actions`} onClose={closeMenu}>
        <button type="button" role="menuitem" onClick={() => action(menu, "rename")}>Rename</button>
        <button type="button" role="menuitem" onClick={() => { closeMenu(); onSelect?.(menu.id); onOpen(menu.id); }}>Edit</button>
        <button type="button" role="menuitem" disabled={!onDuplicate} onClick={() => { closeMenu(); runOperation(() => onDuplicate?.(menu.id)); }}>Duplicate</button>
        <button type="button" role="menuitem" className="is-destructive" disabled={!onDelete} onClick={() => action(menu, "delete")}>Delete</button>
      </StudioAnchoredMenu> : null}
    </> : null}
  </div>;
  return <section className="site-navigation-overview" aria-label={`${siteName} navigation menus`}>
    <p>Navigation menus are a curated collection of links that help visitors get around your website.</p>
    {error ? <p role="alert">{error}{onRetry ? <> <button type="button" onClick={onRetry}>Reconnect</button></> : null}</p> : null}
    {!ready && !error ? <p role="status">Loading {siteName} navigation…</p> : null}
    {hasManagedMenus ? menus.length === 1 ? <div className="site-navigation-single-menu">{entry(menus[0])}</div> : <div className="site-navigation-menu-list" aria-label="Navigation menus">{menus.map(entry)}</div>
      : <button type="button" className="site-navigation-overview-entry" disabled={!ready || Boolean(error)} onClick={() => onOpen()}>
        <AcmIcon name="navigation.compass" scale="Regular-M" size={24} />
        <span><strong>Navigation</strong><small>{siteName} menu</small></span>
        <StudioIcon name="chevron-right" size={18} />
      </button>}
    {hasManagedMenus && onCreate ? <button type="button" className="site-navigation-create-menu" disabled={!ready || Boolean(error)} onClick={() => runOperation(onCreate)}><StudioIcon name="add" size={18} /> Add menu</button> : null}
    {reviewPending ? <div className="navigation-review-action"><StudioButton type="button" onClick={event => { setReviewOpener(event.currentTarget); setReviewOpen(true); }}>Review 1 change…</StudioButton></div> : null}
    {operationError ? <p role="alert">{operationError}</p> : null}
    {reviewOpen ? <NavigationReviewDialog items={[{ id: "navigation", label: "Navigation" }]} opener={reviewOpener} onClose={() => setReviewOpen(false)} onSave={async () => { if (!onReviewSaved) throw new Error("Navigation saving is unavailable."); await onReviewSaved(); }} /> : null}
    {dialog ? <StudioDialog title={dialog.kind === "rename" ? "Rename menu" : "Delete menu"} onClose={() => setDialog(null)} returnFocus={anchor}>
      {dialog.kind === "rename" ? <label>Menu name<TextInput maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label> : <p>Delete “{dialog.menu.name}”? Navigation blocks assigned to this menu will use the default menu.</p>}
      <StudioDialogActions><StudioButton variant="text" type="button" onClick={() => setDialog(null)}>Cancel</StudioButton><StudioButton type="button" className={dialog.kind === "delete" ? "danger-button" : undefined} disabled={dialog.kind === "rename" && !name.trim()} onClick={submitDialog}>{dialog.kind === "rename" ? "Rename" : "Delete"}</StudioButton></StudioDialogActions>
    </StudioDialog> : null}
  </section>;
}
