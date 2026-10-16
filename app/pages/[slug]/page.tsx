import { LocalArticlePage } from "../../writing/[slug]/local-article-page";

export const metadata = { title: "Local page" };

export default async function LocalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LocalArticlePage key={slug} slug={slug} kind="page" />;
}
