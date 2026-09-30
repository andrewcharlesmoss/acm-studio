import { studioControlEntries, studioControlGroups } from "../../controls/library-catalogue";
import { StudioUiLibrary } from "../studio-ui-library";
import { LegacyControlHashRedirect } from "./legacy-control-hash-redirect";

export function ControlsCatalogue() {
  return <StudioUiLibrary section="controls">
    <LegacyControlHashRedirect />
    <main className="ui-controls-main ui-page-intro ui-controls-page">
      <p className="rl-eyebrow">Reusable editor components</p>
      <h1>Controls</h1>
      <p>Working control specimens from the Studio editor and inspector. Each entry has isolated example state, its current consumers and compatibility notes.</p>
      {studioControlGroups.map(group => {
        const entries = studioControlEntries.filter(entry => entry.group === group);
        if (!entries.length) return null;
        return <section className="ui-control-index-group" key={group} aria-labelledby={`control-group-${group.toLowerCase()}`}>
          <h2 id={`control-group-${group.toLowerCase()}`}>{group}</h2>
          <div className="ui-control-index-grid">{entries.map(entry => <article className="ui-control-index-card" key={entry.id}>
            <div><p className="rl-eyebrow">{entry.group}</p><h3>{entry.title}</h3><p>{entry.purpose}</p></div>
            <a href={`/studio/ui/controls/${entry.id}`}>View specimen <span aria-hidden="true">→</span></a>
          </article>)}</div>
        </section>;
      })}
    </main>
  </StudioUiLibrary>;
}
