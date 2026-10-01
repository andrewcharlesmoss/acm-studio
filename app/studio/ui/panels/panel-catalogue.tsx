"use client";

import { useState } from "react";
import { PanelCard } from "@acm/panel";
import { AcmStudioIcon } from "../../acm-studio-icons";

export function PanelCatalogue() {
  const [open, setOpen] = useState(true);
  const [notice, setNotice] = useState("");

  return (
      <section className="ui-panels-page" aria-labelledby="ui-panels-title">
        <header className="ui-page-intro">
          <p className="rl-eyebrow">Reusable application component</p>
          <h1 id="ui-panels-title">Panel card</h1>
          <p>A raised card for related details and actions. The component owns its surface and content slots; each application chooses where it sits and how it opens, closes or resizes.</p>
        </header>
        <section className="ui-panels-specimen" aria-labelledby="ui-panels-specimen-title">
          <h2 id="ui-panels-specimen-title">Account record example</h2>
          <div className="ui-panels-workspace">
            <div className="ui-panels-workspace-content">
              <p className="ui-panels-eyebrow">Directory</p>
              <h3>Accounts</h3>
              <p>Selecting an account can show its related details in a card panel beside the main content.</p>
              {!open ? <button className="ui-panels-show" type="button" onClick={() => setOpen(true)}>Show account record</button> : null}
            </div>
            {open ? (
              <PanelCard
                eyebrow="Account record"
                title="@local_user"
                description="Local User · local_user@example.test"
                headerActions={<button className="ui-panels-close" type="button" aria-label="Close account record example" title="Close example" onClick={() => setOpen(false)}><AcmStudioIcon name="close" /></button>}
                footer={<><div className="ui-panels-actions"><button type="button" onClick={() => setNotice("Sample only — no account was changed.")}>Suspend account</button><button type="button" onClick={() => setNotice("Sample only — no account was changed.")}>Delete account</button></div>{notice ? <p className="ui-panels-notice" role="status">{notice}</p> : null}</>}
              >
                <dl className="ui-panels-fields">
                  <div><dt>Account ID</dt><dd>8a291e72-3be4-43b6-a71c-95acaac28b12</dd></div>
                  <div><dt>Full name</dt><dd>Local User</dd></div>
                  <div><dt>Current email</dt><dd>local_user@example.test</dd></div>
                  <div><dt>Role</dt><dd>Standard user</dd></div>
                  <div><dt>Account status</dt><dd><span>Active</span></dd></div>
                </dl>
              </PanelCard>
            ) : null}
          </div>
          <p className="ui-panels-contract">Close and action handlers in this specimen use temporary page state. Consumers keep application data, permissions, commands, placement and resizing in their own project.</p>
        </section>
      </section>
  );
}
