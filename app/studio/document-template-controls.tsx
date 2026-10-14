import type { LocalFixtureSiteId } from "./test-site/sites";
import type { StudioDocument } from "./editor-model";
import type { TemplateStore, TemplateAssignment } from "./template-model";
import { InspectorSettingRow } from "./controls/inspector-setting-row";

export function DocumentTemplateControls({ document, store, writable, error, onChange, siteId }: { siteId?: LocalFixtureSiteId; document: StudioDocument; store: TemplateStore; writable: boolean; error: string | null; onChange: (assignment?: TemplateAssignment) => void }) {
  const assignment = store.assignments.find(item => item.documentId === document.id);
  const set = assignment ? store.sets.find(item => item.id === assignment.setId) : undefined;
  const template = assignment ? set?.templates.find(item => item.id === assignment.templateId) : undefined;
  const defaults = template?.defaults ?? set?.defaults ?? {};
  return <><InspectorSettingRow label="Template" value={template?.name || "Existing presentation"} disabled={!writable}><label>Assignment<select aria-label="Site Template" disabled={!writable} value={assignment ? `${assignment.setId}/${assignment.templateId}` : ""} onChange={event => {
    if (!event.target.value) { onChange(); return; }
    const [setId, templateId] = event.target.value.split("/"); onChange({ documentId: document.id, kind: document.kind, setId, templateId });
  }}><option value="">Existing presentation</option>{store.sets.flatMap(item => item.templates.map(template => <option key={`${item.id}/${template.id}`} value={`${item.id}/${template.id}`}>{template.name} · {template.kind === "page" ? "Page" : "Post"}</option>))}</select></label>{assignment ? <><div className="inspector-value-row"><span>Template author</span><strong>{defaults.author || "Not set"}</strong></div><div className="inspector-value-row"><span>Template category</span><strong>{defaults.category || "Not set"}</strong></div><div className="inspector-value-row"><span>Template tags</span><strong>{defaults.tags?.join(", ") || "Not set"}</strong></div><div className="inspector-value-row"><span>Template parent</span><strong>{defaults.parentPageId || "Not set"}</strong></div></> : null}{assignment ? <a href={`/studio?${siteId ? `site=${siteId}&` : ""}mode=templates&set=${encodeURIComponent(assignment.setId)}&target=${encodeURIComponent(assignment.templateId)}`}>Edit template</a> : <a href={siteId ? `/studio?site=${siteId}&mode=templates` : "/studio?mode=templates"}>Manage templates</a>}</InspectorSettingRow>{error ? <p role="alert">{error}</p> : null}</>;
}
