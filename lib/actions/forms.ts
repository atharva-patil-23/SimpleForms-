"use server";

/**
 * Server actions for the builder (ENGINEERING_PLAN T8/T9). All writes go
 * through the authed server client and are authorized by RLS (owner_id =
 * auth.uid()); we set owner_id explicitly so the insert WITH CHECK passes.
 *
 * Slug generation happens here at publish (decision 4): nanoid + UNIQUE index +
 * collision retry. Schema is Zod-validated on save (decision 3).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseFormSchema, type Question } from "@/lib/schema";
import { generateSlug } from "@/lib/slug";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createForm() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("forms")
    .insert({ owner_id: user.id, title: "Untitled form", schema: [] })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/forms/${data.id}`);
}

export interface SaveFormInput {
  id: string;
  title: string;
  description: string | null;
  schema: unknown;
  successMessage?: string | null;
  redirectUrl?: string | null;
}

export async function saveForm(
  input: SaveFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();

  let questions: Question[];
  try {
    questions = parseFormSchema(input.schema);
  } catch {
    return { ok: false, error: "Some questions aren't valid yet." };
  }

  // Redirect URL, if set, must be an absolute http(s) URL — never javascript:
  // or other schemes (the respondent's browser will navigate to it).
  const redirect = input.redirectUrl?.trim() || null;
  if (redirect && !/^https?:\/\/[^\s]+$/i.test(redirect)) {
    return { ok: false, error: "Redirect URL must start with http:// or https://" };
  }

  const base = {
    title: input.title.trim() || "Untitled form",
    description: input.description?.trim() || null,
    schema: questions,
  };
  const withPostSubmit = {
    ...base,
    success_message: input.successMessage?.trim() || null,
    redirect_url: redirect,
  };

  // Try to persist the post-submit settings; if the migration adding those
  // columns hasn't run yet, fall back to saving the core fields so editing
  // never silently breaks.
  let { error } = await supabase
    .from("forms")
    .update(withPostSubmit)
    .eq("id", input.id)
    .eq("owner_id", user.id);
  if (error) {
    ({ error } = await supabase
      .from("forms")
      .update(base)
      .eq("id", input.id)
      .eq("owner_id", user.id));
  }

  if (error) return { ok: false, error: "Couldn't save. Please try again." };

  revalidatePath(`/forms/${input.id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function publishForm(
  id: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();

  // Re-read the form to validate it's publishable (≥1 question). Owner-scoped.
  const { data: form } = await supabase
    .from("forms")
    .select("schema, public_slug")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  const questions = (form?.schema as Question[]) ?? [];
  if (questions.length === 0) {
    return { ok: false, error: "Add at least one question before publishing." };
  }

  // Reuse an existing slug if the form was published before; otherwise mint one
  // with collision retry against the UNIQUE index.
  let slug = form?.public_slug as string | null;
  if (!slug) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug();
      const { error } = await supabase
        .from("forms")
        .update({ status: "published", public_slug: candidate })
        .eq("id", id)
        .eq("owner_id", user.id);
      if (!error) {
        slug = candidate;
        break;
      }
      // 23505 = unique_violation → slug collision, retry.
      if (error.code !== "23505") {
        return { ok: false, error: "Couldn't publish. Please try again." };
      }
    }
    if (!slug) {
      return { ok: false, error: "Couldn't generate a unique link. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("forms")
      .update({ status: "published" })
      .eq("id", id)
      .eq("owner_id", user.id);
    if (error) return { ok: false, error: "Couldn't publish. Please try again." };
  }

  revalidatePath(`/forms/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, slug };
}

export async function unpublishForm(id: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("forms")
    .update({ status: "draft" })
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidatePath(`/forms/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteForm(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("forms").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
