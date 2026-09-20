export function ArticleMetaIcon({ name }: { name: "clock" | "comments" }) {
  if (name === "clock") {
    return <svg aria-hidden="true" className="article-meta-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7.5v5l3.5 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg>;
  }
  return <svg aria-hidden="true" className="article-meta-icon" viewBox="0 0 24 24"><path d="M5.25 6.5h13.5A2.25 2.25 0 0 1 21 8.75v6A2.25 2.25 0 0 1 18.75 17H11l-4.25 3v-3H5.25A2.25 2.25 0 0 1 3 14.75v-6A2.25 2.25 0 0 1 5.25 6.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /><path d="M8 11.75h.01M12 11.75h.01M16 11.75h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" /></svg>;
}
