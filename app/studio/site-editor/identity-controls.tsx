"use client";
import { useMemo, type CSSProperties } from "react";
import { AcmIcon } from "@acm/icons/react";
import { TextInput } from "../controls/native-fields";
import { StudioButton } from "../controls/button";
import { ToggleSetting } from "../controls/toggle-setting";
import { StudioIcon } from "../studio-icons";
import { useBlobUrls } from "../controls/use-blob-urls";
import { identityFieldHidden, resolveIdentityPreview, type IdentityField, type IdentityValues, type PreviewScope, type SiteIdentity, type ResolvedSiteIdentity } from "./identity-preview-state";
import { websiteHeaderTitle, sampleBrowserTabTitle } from "./identity-preview-presentation";
import "./site-editor-preview.css";

/** Production identity controls; hosts retain history and image-source adapters. */
export function IdentityControls({values, scope, onChange:change, onHide, onReset, onRemoveImage, onChooseImage, idPrefix="site-identity"}: {
 values:IdentityValues; scope:PreviewScope; onChange:(patch:Partial<SiteIdentity>)=>void;
 onHide:(field:IdentityField,hidden:boolean)=>void; onReset:(field:IdentityField)=>void;
 onRemoveImage:(field:"logo"|"icon")=>void;
 onChooseImage:(field:"logo"|"icon",opener:HTMLElement)=>void; idPrefix?:string;
}) {
 const authoredIdentity=values[scope];
 const displayIdentity=resolveIdentityPreview({...values,[scope]:{...authoredIdentity,hidden:undefined}},scope);
 const images=useMemo(()=>[displayIdentity.logo,displayIdentity.icon].filter((image):image is NonNullable<typeof image>=>Boolean(image)),[displayIdentity.logo,displayIdentity.icon]);
 const imageUrls=useBlobUrls(images);
 return <div className="site-editor-preview-settings">
            {(["title", "tagline"] as const).map(field => {
              const label = field === "title" ? "Site Title" : "Site Tagline";
              const hidden = identityFieldHidden(authoredIdentity, field);
              const inherited = scope !== "global" && !hidden && !authoredIdentity[field]?.trim();
              const inputId = `${idPrefix}-${field}`;
              return <section key={field} className="site-identity-text-setting" aria-label={`${label} setting`}>
                <label htmlFor={inputId}><span>{label}</span><TextInput id={inputId} maxLength={field === "title" ? 200 : 500} value={authoredIdentity[field] ?? ""} disabled={hidden} placeholder={inherited ? displayIdentity[field] : undefined} aria-describedby={`${inputId}-help`} onChange={event => change({ [field]: event.currentTarget.value })} /></label>
                {scope !== "global" ? <div className="site-identity-text-actions"><ToggleSetting label={`Hide ${label}`} checked={hidden} onChange={hide => onHide(field, hide)} /><StudioButton variant="text" aria-label={`Reset ${label}`} title="Restore inheritance" disabled={authoredIdentity[field] === undefined && !hidden} onClick={() => onReset(field)}>Reset</StudioButton></div> : null}
                <p id={`${inputId}-help`} className="site-identity-field-help">{hidden ? "Hidden in the preview." : inherited ? "Using Global Defaults. Enter text to override." : field === "title" ? "Shown in the sample website header and browser tab." : "A short description shown in the sample website header."}</p>
              </section>;
            })}
            {(["logo", "icon"] as const).map(field => {
              const label = field === "logo" ? "Site Logo" : "Site Icon";
              const hidden = identityFieldHidden(authoredIdentity, field);
              const inherited = scope !== "global" && authoredIdentity[field] === undefined;
              return <section className="site-identity-image-setting" key={field} aria-label={field === "logo" ? "Site Logo" : "Site Icon"}><h3>{field === "logo" ? "Site Logo" : "Site Icon"}</h3>
              <div className="site-identity-image-frame">
                <div className="site-identity-image-preview">
                  <button className={`site-identity-image-choose${displayIdentity[field] ? " has-image" : ""}`} type="button" disabled={hidden} aria-label={(displayIdentity[field] ? "Replace " : "Choose ") + (field === "logo" ? "logo" : "icon")} onClick={event => onChooseImage(field, event.currentTarget)}>
                  {/* Existing Files bytes stay in memory; useBlobUrls owns preview URL lifetimes. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                    {displayIdentity[field] && imageUrls[displayIdentity[field].id] ? <img src={imageUrls[displayIdentity[field].id]} alt="" /> : <IdentityPlaceholder kind={field} label="" showLabel />}
                  </button>
                  {authoredIdentity[field] ? <StudioButton variant="text" type="button" className="site-identity-image-remove" aria-label={"Remove " + (field === "logo" ? "logo" : "icon")} title={"Remove " + (field === "logo" ? "logo" : "icon")} onClick={() => onRemoveImage(field)}><StudioIcon name="close" size={20} /></StudioButton> : null}
                </div>
              </div>
              {scope !== "global" ? <div className="site-identity-text-actions"><ToggleSetting label={`Hide ${label}`} checked={hidden} onChange={hide => onHide(field, hide)} /><StudioButton variant="text" aria-label={`Reset ${label}`} title="Restore inheritance" disabled={authoredIdentity[field] === undefined && !hidden} onClick={() => onReset(field)}>Reset</StudioButton></div> : null}
              {scope !== "global" ? <p className="site-identity-field-help">{hidden ? "Hidden in the preview." : inherited ? "Using Global Defaults. Choose an image to override." : "Using a site-specific image."}</p> : null}
              <p className="site-identity-field-help">{field === "logo" ? "Displays in the sample website header." : "Shown only in the sample browser tab. It will not change Studio’s tab icon. Use a square image at least 512 by 512 pixels."}</p>
            </section>; })}

        </div>;
}

export function IdentityPlaceholder({ kind, label = `Generic ${kind} placeholder`, showLabel = kind === "logo" }: { kind: "logo" | "icon"; label?: string; showLabel?: boolean }) {
  return <span className={`site-identity-placeholder site-identity-placeholder--${kind}`} role="img" aria-label={label || undefined}><AcmIcon name={kind === "logo" ? "insert.image" : "account.record"} size={kind === "logo" ? 40 : 24} scale="Regular-M" />{showLabel ? <span>{kind === "logo" ? "Logo" : "Icon"}</span> : null}</span>;
}

export function IdentityPreviewHeader({identity,scope,imageUrls,titleStyle}:{identity:ResolvedSiteIdentity;scope:PreviewScope;imageUrls:Record<string,string>;titleStyle?:CSSProperties}) {
 const title=websiteHeaderTitle(identity.title);
 return <div className="site-identity-page-header">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {identity.logo&&imageUrls[identity.logo.id]?<img src={imageUrls[identity.logo.id]} alt={identity.logo.altText||identity.title||"Site logo"}/>:scope==="global"?<IdentityPlaceholder kind="logo"/>:null}
 <div>{title?<h2 style={titleStyle}>{title}</h2>:null}{identity.tagline?<p>{identity.tagline}</p>:null}</div>
 </div>;
}
export function IdentityPreviewTab({identity,scope,imageUrls}:{identity:ResolvedSiteIdentity;scope:PreviewScope;imageUrls:Record<string,string>}) {
 const title=sampleBrowserTabTitle(identity.title);
 return <div className="site-identity-browser-tab" aria-label="Sample browser tab">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {identity.icon&&imageUrls[identity.icon.id]?<img src={imageUrls[identity.icon.id]} alt="Site icon"/>:scope==="global"?<IdentityPlaceholder kind="icon"/>:null}{title?<span>{title}</span>:null}
 </div>;
}
