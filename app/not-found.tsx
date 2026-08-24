import { PageFrame } from "./components/site-shell";

export default function NotFound() {
  return (
    <PageFrame>
      <main className="not-found">
        <p className="eyebrow">404 — not found</p>
        <h1>This page has not joined the collection.</h1>
        <p>The project or article may have moved, or it may not exist yet.</p>
        <a className="primary-action" href="/">Return home</a>
      </main>
    </PageFrame>
  );
}
