"use client";

import { useEffect, useState } from "react";
import { controlGroupId, studioControlEntries, studioControlGroups } from "../../controls/library-catalogue";

const orderedControlEntries = studioControlGroups.flatMap(group => studioControlEntries.filter(entry => entry.group === group));

export function ControlsNavigation() {
  const [activeId, setActiveId] = useState(orderedControlEntries[0]?.id ?? "");

  useEffect(() => {
    let frame = 0;

    function updateActiveControl() {
      const marker = window.innerHeight / 2;
      let nextId = orderedControlEntries[0]?.id ?? "";

      for (const entry of orderedControlEntries) {
        const specimen = document.getElementById(entry.id);
        if (!specimen) continue;
        if (specimen.getBoundingClientRect().top > marker) break;
        nextId = entry.id;
      }

      setActiveId(current => current === nextId ? current : nextId);
    }

    function scheduleActiveControlUpdate() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveControl();
      });
    }

    updateActiveControl();
    window.addEventListener("scroll", scheduleActiveControlUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveControlUpdate);
    window.addEventListener("hashchange", scheduleActiveControlUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleActiveControlUpdate);
      window.removeEventListener("resize", scheduleActiveControlUpdate);
      window.removeEventListener("hashchange", scheduleActiveControlUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <aside className="ui-catalogue-navigation" aria-label="Controls menu">
    <h2>Jump to</h2>
    <nav aria-label="Control specimens"><div className="ui-catalogue-navigation-groups">{studioControlGroups.map(group => {
      const entries = studioControlEntries.filter(entry => entry.group === group);
      if (!entries.length) return null;
      return <section className="ui-catalogue-navigation-group" key={group}>
        <h3><a href={`#${controlGroupId(group)}`}>{group}</a></h3>
        <ul className="ui-catalogue-navigation-list">{entries.map(entry => <li key={entry.id}><a href={`#${entry.id}`} aria-current={activeId === entry.id ? "location" : undefined} onClick={() => setActiveId(entry.id)}>{entry.title}</a></li>)}</ul>
      </section>;
    })}</div></nav>
  </aside>;
}
