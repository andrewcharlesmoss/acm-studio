import { redirect } from "next/navigation";

export default async function TemplatesPage({ searchParams }: {
  searchParams: Promise<{ set?: string | string[]; target?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ mode: "templates" });
  for (const key of ["set", "target"] as const) {
    const value = params[key];
    const selected = Array.isArray(value) ? value[0] : value;
    if (selected) query.set(key, selected);
  }
  redirect(`/studio?${query.toString()}`);
}
