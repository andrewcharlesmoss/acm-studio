import type { StudioDocument } from "./editor-model";
import type { TemplateStore, TemplateAssignment } from "./template-model";

export function DocumentTemplateControls({ document, store, writable, error, onChange }: { document: StudioDocument; store: TemplateStore; writable: boolean; error: string | null; onChange: (assignment?: TemplateAssignment) => void }) {
  const assignment = store.assignments.find(item => item.documentId === document.id);
  return <section className="inspector-section template-assignment"><h3>Site Template</h3><label>Template<select aria-label="Site Template" disabled={!writable} value={assignment ? `${assignment.setId}/${assignment.templateId}` : ""} onChange={event => {
    if (!event.target.value) { onChange(); return; }
    const [setId, templateId] = event.target.value.split("/"); onChange({ documentId: document.id, kind: document.kind, setId, templateId });
  }}><option value="">Existing Presentation</option>{store.sets.map(set => <optgroup key={set.id} label={set.name}>{set.templates.filter(template => template.kind === document.kind).map(template => <option key={template.id} value={`${set.id}/${template.id}`}>{template.name}</option>)}</optgroup>)}</select></label>{error ? <p role="alert">{error}</p> : null}{assignment ? <a href={`/studio/templates?set=${encodeURIComponent(assignment.setId)}&target=${encodeURIComponent(assignment.templateId)}`}>Edit Template</a> : <a href="/studio/templates">Manage Templates</a>}</section>;
}
