/**
 * Public filling surface (ENGINEERING_PLAN T7). An RSC that reads the PUBLISHED
 * form by slug (anon RLS only exposes published forms), then hands off to the
 * client reducer experience. A bad or draft slug is not-found → calm 404.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FillExperience } from "@/components/fill/FillExperience";
import type { Question } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function FillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: form } = await supabase
    .from("forms")
    .select("title, schema, status")
    .eq("public_slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!form) notFound();

  const questions = (form.schema as Question[]) ?? [];
  if (questions.length === 0) notFound();

  return (
    <FillExperience slug={slug} title={form.title} questions={questions} />
  );
}
