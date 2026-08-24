import type { Metadata } from "next";
import { PageFrame } from "../components/site-shell";
import { articles } from "../content/sample-content";
import { WritingArchiveList } from "./writing-archive-list";

export const metadata: Metadata = {
  title: "Writing",
  description: "An archive of technology, Excel and personal writing by Andrew Charles Moss.",
};

export default function WritingPage() {
  return (
    <PageFrame>
      <main>
        <header className="page-intro writing-intro">
          <p className="eyebrow">The archive</p>
          <h1>Writing that records the useful part.</h1>
          <p className="page-intro-copy">
            Technology, Excel and personal observations collected over time.
            The archive now supports the projects rather than defining the whole site.
          </p>
        </header>
        <WritingArchiveList articles={articles} />
        <section className="archive-strip">
          <p>Existing articles will remain available with their original addresses when migration begins.</p>
          <span>Migration is deliberately deferred</span>
        </section>
      </main>
    </PageFrame>
  );
}
