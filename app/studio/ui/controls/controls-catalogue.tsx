import { studioControlEntries, studioControlGroups } from "../../controls/library-catalogue";
import { StudioUiLibrary } from "../studio-ui-library";
import { ControlSpecimen } from "./control-specimen";

function controlGroupId(group: string) {
  return `control-group-${group.toLocaleLowerCase("en-GB")}`;
}

export function ControlsCatalogue() {
  return <StudioUiLibrary section="controls"><div className="ui-controls-layout">
    <aside className="ui-catalogue-navigation" aria-label="Controls menu">
      <h2>Jump to</h2>
      <nav aria-label="Control specimens"><div className="ui-catalogue-navigation-groups">{studioControlGroups.map(group => {
        const entries = studioControlEntries.filter(entry => entry.group === group);
        if (!entries.length) return null;
        return <section className="ui-catalogue-navigation-group" key={group}>
          <h3><a href={`#${controlGroupId(group)}`}>{group}</a></h3>
          <ul className="ui-catalogue-navigation-list">{entries.map(entry => <li key={entry.id}><a href={`#${entry.id}`}>{entry.title}</a></li>)}</ul>
        </section>;
      })}</div></nav>
    </aside>
    <main className="ui-controls-main ui-page-intro ui-controls-page">
      <p className="rl-eyebrow">Reusable inspector components</p>
      <h1>Controls</h1>
      <p>All 12 working control specimens live on this page. Use the grouped jump links to move between examples; each one has isolated state, a reset action and details about its actual consumers.</p>
      {studioControlGroups.map(group => {
        const entries = studioControlEntries.filter(entry => entry.group === group);
        if (!entries.length) return null;
        return <section className="ui-control-group" id={controlGroupId(group)} key={group} aria-labelledby={`${controlGroupId(group)}-heading`}>
          <h2 id={`${controlGroupId(group)}-heading`}>{group}</h2>
          <div className="ui-control-group-specimens">{entries.map(entry => <ControlSpecimen entry={entry} key={entry.id} />)}</div>
        </section>;
      })}
    </main>
  </div></StudioUiLibrary>;
}
