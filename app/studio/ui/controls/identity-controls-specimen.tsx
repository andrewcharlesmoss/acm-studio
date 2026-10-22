"use client";

import { useEffect, useId, useMemo, useReducer, useState } from "react";
import { IdentityControls, IdentityPreviewHeader, IdentityPreviewTab } from "../../site-editor/identity-controls";
import { createIdentityPreview, identityPreviewReducer, resolveIdentityPreview, type IdentityImage, type PreviewScope } from "../../site-editor/identity-preview-state";
import { SelectControl } from "../../controls/native-fields";
import { HistoryActions } from "../../controls/history-actions";
import { ImageChoiceGrid } from "../../controls/image-choice-grid";
import { useBlobUrls } from "../../controls/use-blob-urls";
import { StudioDialog } from "../../overlays/dialog";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";

/** Bundled examples, independent of Files, product stores and write ownership. */
export function IdentityControlsSpecimen() {
  const [choices,setChoices]=useState<IdentityImage[]|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const abort=new AbortController();
    void Promise.all([
      {id:"identity-landscape",name:"Landscape example",url:"/specimens/landscape.png"},
      {id:"identity-mountain",name:"Mountain example",url:"/specimens/mont-blanc.jpg"},
    ].map(async item=>{
      const response=await fetch(item.url,{signal:abort.signal});
      if(!response.ok)throw new Error("Example image unavailable");
      return {id:item.id,name:item.name,altText:item.name,blob:await response.blob()};
    })).then(images=>{if(!abort.signal.aborted)setChoices(images);}).catch(()=>{if(!abort.signal.aborted)setFailed(true);});
    return()=>abort.abort();
  },[]);
  if(failed)return <p role="alert">Example images could not be loaded. Reset the example to try again.</p>;
  if(!choices)return <p role="status">Loading identity example…</p>;
  return <IdentityControlsExample choices={choices}/>;
}

export function IdentityControlsExample({choices}:{choices:IdentityImage[]}) {
  const [history,dispatch]=useReducer(identityPreviewReducer,choices,images=>{
    const initial=createIdentityPreview();
    initial.present.global.logo=images[0];initial.present.global.icon=images[1];
    initial.present.test={};
    return initial;
  });
  const [scope,setScope]=useState<PreviewScope>("test");
  const [picker,setPicker]=useState<{field:"logo"|"icon";opener:HTMLElement;scope:PreviewScope}|null>(null);
  const prefix=useId();
  const identity=resolveIdentityPreview(history.present,scope);
  const images=useMemo(()=>[...choices,...[identity.logo,identity.icon].filter((image):image is IdentityImage=>Boolean(image))],[choices,identity.logo,identity.icon]);
  const urls=useBlobUrls(images);
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Scoped history for the temporary production-control specimen.
  return <div className="site-editor-preview ui-identity-example" role="group" aria-label="Identity controls example" onKeyDown={event=>{
    if(isNativeEditingTarget(event.target)||(event.target instanceof Element&&event.target.closest("dialog")))return;
    const action=workspaceHistoryShortcut(event);if(!action)return;
    event.preventDefault();event.stopPropagation();dispatch({type:action});
  }}>
    <HistoryActions canUndo={history.past.length>0} canRedo={history.future.length>0} onUndo={()=>dispatch({type:"undo"})} onRedo={()=>dispatch({type:"redo"})}/>
    <label className="ui-identity-scope">Design Scope<SelectControl value={scope} onChange={event=>setScope(event.target.value as PreviewScope)}><option value="global">Global Defaults</option><option value="test">Test</option><option value="test2">Test 2</option></SelectControl></label>
    <div className="ui-identity-example-layout">
      <IdentityControls values={history.present} scope={scope} idPrefix={`identity-example-${prefix}`} onChange={patch=>dispatch({type:"change",site:scope,patch})} onHide={(field,hidden)=>dispatch({type:"set-hidden",site:scope,field,hidden})} onReset={field=>dispatch({type:"reset-field",site:scope,field})} onResetAll={() => dispatch({ type: "reset-all", site: scope })} onRemoveImage={field=>dispatch({type:"remove-image",site:scope,field})} onChooseImage={(field,opener)=>setPicker({field,opener,scope})}/>
      <div className="ui-identity-example-preview" aria-label="Identity example preview"><IdentityPreviewTab identity={identity} scope={scope} imageUrls={urls}/><IdentityPreviewHeader identity={identity} scope={scope} imageUrls={urls}/></div>
    </div>
    {picker?<StudioDialog className="image-choice-dialog" title={`Choose ${picker.field==="logo"?"Logo":"Icon"}`} returnFocus={picker.opener} onClose={()=>setPicker(null)}><ImageChoiceGrid choices={choices} urls={urls} onChoose={image=>{dispatch({type:"change",site:picker.scope,patch:{[picker.field]:image}});setPicker(null);}}/></StudioDialog>:null}
  </div>;
}
