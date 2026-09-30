import { controlGroupId, studioControlEntries, studioControlGroups } from "../../controls/library-catalogue";
import { StudioUiLibrary } from "../studio-ui-library";
import { ControlSpecimen } from "./control-specimen";
import { ControlsNavigation } from "./controls-navigation";

export function ControlsCatalogue() {
  return <StudioUiLibrary section="controls"><div className="ui-controls-layout">
    <ControlsNavigation />
    <section className="ui-controls-main ui-page-intro ui-controls-page" aria-labelledby="ui-controls-title">
      <p className="rl-eyebrow">Reusable inspector components</p>
      <h1 id="ui-controls-title">Controls</h1>
      <p>All 12 working control specimens live on this page. Use the grouped jump links to move between examples; each one has isolated state, a reset action and details about its actual consumers.</p>
      {studioControlGroups.map(group => {
        const entries = studioControlEntries.filter(entry => entry.group === group);
        if (!entries.length) return null;
        return <section className="ui-control-group" id={controlGroupId(group)} key={group} aria-labelledby={`${controlGroupId(group)}-heading`}>
          <h2 id={`${controlGroupId(group)}-heading`}>{group}</h2>
          <div className="ui-control-group-specimens">{entries.map(entry => <ControlSpecimen entry={entry} key={entry.id} />)}</div>
        </section>;
      })}
    </section>
  </div></StudioUiLibrary>;
}
