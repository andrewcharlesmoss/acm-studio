"use client";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";
import type { useStudioDocumentActions } from "./use-studio-document-actions";
import type { StudioWorkspace } from "./editor-model";
import type { TemplateStore } from "./template-model";

/** Presentation only; commands and draft state stay with document actions. */
export function StudioDocumentDialogs({ actions, workspace, templates, writable, templateWritable }: {
  actions: ReturnType<typeof useStudioDocumentActions>; workspace: StudioWorkspace;
  templates: TemplateStore; writable: boolean; templateWritable: boolean;
}) {
  const { newTemplateChoice, saveTemplateDialog, renameDocumentDialog, actionError } = actions;
  const choices = templates.sets.flatMap(set => set.templates.map(template => ({ set, template })));
  return <>
    {newTemplateChoice ? <StudioDialog title="New from template" className="template-dialog" onClose={() => actions.setNewTemplateChoice(undefined)}>
      <form onSubmit={event => { event.preventDefault(); actions.commitNewDocumentFromTemplate(); }}>
        <p>Choose a presentation first. The new document starts empty and inherits only the reusable settings supplied by this template.</p>
        <label><span>Template</span><select value={newTemplateChoice} onChange={event => actions.setNewTemplateChoice(event.target.value)}>{choices.map(({ set, template }) => <option key={`${set.id}/${template.id}`} value={`${set.id}/${template.id}`}>{template.name} ({template.kind === "post" ? "Post" : "Page"})</option>)}</select></label>
        <p className="setting-note">The document remains a {choices.find(item => `${item.set.id}/${item.template.id}` === newTemplateChoice)?.template.kind === "post" ? "post" : "page"} after creation. You can override inherited values in the Document pane.</p>
        {actionError ? <p role="alert">{actionError}</p> : null}
        <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={() => actions.setNewTemplateChoice(undefined)}>Cancel</StudioButton><StudioButton type="submit" disabled={!writable || !templateWritable}>Create document</StudioButton></StudioDialogActions>
      </form>
    </StudioDialog> : null}
    {saveTemplateDialog ? <StudioDialog title="Save as template" className="template-dialog" onClose={() => actions.setSaveTemplateDialog(undefined)}>
      <form onSubmit={event => { event.preventDefault(); actions.commitSaveAsTemplate(saveTemplateDialog); }}>
        <p>The document body and personal content stay with this document. Choose reusable defaults below; the template keeps the layout and dynamic field structure.</p>
        <label><span>Template name</span><input required value={saveTemplateDialog.name} onChange={event => actions.setSaveTemplateDialog({ ...saveTemplateDialog, name: event.target.value })} /></label>
        <label><span>Template set</span><input required value={saveTemplateDialog.destination} onChange={event => actions.setSaveTemplateDialog({ ...saveTemplateDialog, destination: event.target.value })} /></label>
        <fieldset><legend>Reusable defaults</legend>{(["Author", "Category", "Tags", "Parent page"] as const).map((label, index) => {
          const key = (["includeAuthor", "includeCategory", "includeTags", "includeParentPage"] as const)[index];
          return <label className="checkbox-setting" key={key}><input type="checkbox" checked={saveTemplateDialog[key]} onChange={event => actions.setSaveTemplateDialog({ ...saveTemplateDialog, [key]: event.target.checked })} /><span>{label}</span></label>;
        })}</fieldset>
        <p className="setting-note">The review is deliberately conservative: dynamic structure and layout are captured, while ordinary document text, media and publication state stay with the source document.</p>
        {actionError ? <p role="alert">{actionError}</p> : null}
        <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={() => actions.setSaveTemplateDialog(undefined)}>Cancel</StudioButton><StudioButton type="submit" disabled={!writable || !templateWritable}>Save template</StudioButton></StudioDialogActions>
      </form>
    </StudioDialog> : null}
    {renameDocumentDialog ? <StudioDialog title={`Rename ${workspace.documents.find(item => item.id === renameDocumentDialog.documentId)?.kind ?? "document"}`} className="template-dialog" selectInitialText returnFocus={renameDocumentDialog.opener} onClose={() => actions.setRenameDocumentDialog(null)}>
      <form onSubmit={event => { event.preventDefault(); actions.confirmRenameDocument(); }}>
        <p>Change the title of this local document.</p>
        <label><span>Name</span><input required maxLength={160} value={renameDocumentDialog.name} onChange={event => actions.setRenameDocumentDialog({ ...renameDocumentDialog, name: event.target.value })} /></label>
        {actionError ? <p role="alert">{actionError}</p> : null}
        <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={() => actions.setRenameDocumentDialog(null)}>Cancel</StudioButton><StudioButton type="submit" disabled={!writable || !renameDocumentDialog.name.trim()}>Rename</StudioButton></StudioDialogActions>
      </form>
    </StudioDialog> : null}
  </>;
}
