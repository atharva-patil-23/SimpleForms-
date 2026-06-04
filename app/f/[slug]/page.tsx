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

type ThemePref = "light" | "dark" | "auto";

export default async function FillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string; theme?: string }>;
}) {
  const { slug } = await params;
  const { embed, theme } = await searchParams;
  const supabase = await createClient();

  // Try to load the post-submit settings columns; if the migration hasn't been
  // applied yet, fall back to the base columns so the form still renders.
  const BASE = "title, schema, status";
  let res = await supabase
    .from("forms")
    .select(`${BASE}, success_message, redirect_url`)
    .eq("public_slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (res.error) {
    res = await supabase
      .from("forms")
      .select(BASE)
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();
  }
  const form = res.data as
    | {
        title: string;
        schema: Question[];
        status: string;
        success_message?: string | null;
        redirect_url?: string | null;
      }
    | null;

  if (!form) notFound();

  const questions = (form.schema as Question[]) ?? [];
  if (questions.length === 0) notFound();

  // ?embed=1 renders a chrome-free variant meant to live inside an <iframe>
  // on another site (see the editor's Embed snippet).
  const isEmbed = embed === "1" || embed === "true";
  const themePref: ThemePref =
    theme === "dark" || theme === "auto" || theme === "light"
      ? (theme as ThemePref)
      : "light";

  return (
    <>
      {/* Set the theme before paint so a dark embed never flashes white first.
          themePref is whitelisted to light|dark|auto, so this is injection-safe. */}
      {themePref !== "light" ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme','${themePref}')`,
          }}
        />
      ) : null}
      <FillExperience
        slug={slug}
        title={form.title}
        questions={questions}
        embed={isEmbed}
        theme={themePref}
        successMessage={form.success_message ?? null}
        redirectUrl={form.redirect_url ?? null}
      />
    </>
  );
}
