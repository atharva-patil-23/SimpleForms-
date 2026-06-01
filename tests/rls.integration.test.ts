/**
 * THE SECURITY SPINE — 8 RLS assertions vs a local `supabase start` stack
 * (ENGINEERING_PLAN decision 8, test plan #9). This is the critical week-1
 * deliverable: it pins down exactly what anon and owners can and cannot do.
 *
 * Run: `supabase start` then `npm run test:rls`. The suite provisions two
 * users (A, B) and a published + draft form via the service role, then makes
 * every assertion through anon / authed clients that are subject to RLS.
 *
 * The 8 assertions:
 *   1. anon CAN read a published form
 *   2. anon CANNOT read a draft form
 *   3. anon CANNOT read responses
 *   4. anon CAN insert a response into a published form (and NOT into a draft)
 *   5. owner CAN read their own forms
 *   6. owner CAN read responses to their own forms
 *   7. userA CANNOT read userB's forms or responses (isolation)
 *   8. the per-form cap path: response count RPC works for anon (cap is
 *      enforced in the handler; here we assert the count primitive it relies on)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  anonClient,
  serviceClient,
  createUserClient,
  uniqueEmail,
} from "./helpers/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const sampleSchema = [
  { id: "name", type: "short_text", title: "Your name", required: true },
];

let admin: SupabaseClient;
let userA: SupabaseClient;
let userB: SupabaseClient;
let userAId: string;

let publishedFormId: string;
let publishedSlug: string;
let draftFormId: string;
let responseId: string;

beforeAll(async () => {
  admin = serviceClient();

  const a = await createUserClient(uniqueEmail("user-a"));
  userA = a.client;
  userAId = a.userId;

  const b = await createUserClient(uniqueEmail("user-b"));
  userB = b.client;

  publishedSlug = `pub-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  // Seed a published form, a draft form, and one response — via service role.
  const { data: pub, error: pubErr } = await admin
    .from("forms")
    .insert({
      owner_id: userAId,
      title: "Published form",
      schema: sampleSchema,
      status: "published",
      public_slug: publishedSlug,
    })
    .select("id")
    .single();
  if (pubErr) throw pubErr;
  publishedFormId = pub.id;

  const { data: draft, error: draftErr } = await admin
    .from("forms")
    .insert({
      owner_id: userAId,
      title: "Draft form",
      schema: sampleSchema,
      status: "draft",
    })
    .select("id")
    .single();
  if (draftErr) throw draftErr;
  draftFormId = draft.id;

  const { data: resp, error: respErr } = await admin
    .from("responses")
    .insert({
      form_id: publishedFormId,
      answers: { name: "Seed" },
      schema_snapshot: sampleSchema,
    })
    .select("id")
    .single();
  if (respErr) throw respErr;
  responseId = resp.id;
});

afterAll(async () => {
  // Cascades clean up responses; remove the auth users too.
  await admin.from("forms").delete().eq("owner_id", userAId);
});

describe("RLS — the security spine (8 assertions)", () => {
  it("1. anon CAN read a published form", async () => {
    const { data, error } = await anonClient()
      .from("forms")
      .select("id, title")
      .eq("id", publishedFormId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(publishedFormId);
  });

  it("2. anon CANNOT read a draft form", async () => {
    const { data } = await anonClient()
      .from("forms")
      .select("id")
      .eq("id", draftFormId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("3. anon CANNOT read responses", async () => {
    const { data } = await anonClient()
      .from("responses")
      .select("id")
      .eq("id", responseId);
    // Default-deny → empty set (not an error, just no visible rows).
    expect(data ?? []).toHaveLength(0);
  });

  it("4. anon CAN insert into a published form, but NOT into a draft", async () => {
    const good = await anonClient()
      .from("responses")
      .insert({
        form_id: publishedFormId,
        answers: { name: "Anon" },
        schema_snapshot: sampleSchema,
      });
    expect(good.error).toBeNull();

    const bad = await anonClient()
      .from("responses")
      .insert({
        form_id: draftFormId,
        answers: { name: "Anon" },
        schema_snapshot: sampleSchema,
      });
    expect(bad.error).not.toBeNull(); // RLS WITH CHECK denies
  });

  it("5. owner CAN read their own forms", async () => {
    const { data, error } = await userA
      .from("forms")
      .select("id")
      .eq("owner_id", userAId);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("6. owner CAN read responses to their own forms", async () => {
    const { data, error } = await userA
      .from("responses")
      .select("id")
      .eq("form_id", publishedFormId);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("7. userB CANNOT read userA's forms or responses (isolation)", async () => {
    const forms = await userB
      .from("forms")
      .select("id")
      .eq("id", draftFormId)
      .maybeSingle();
    expect(forms.data).toBeNull();

    const responses = await userB
      .from("responses")
      .select("id")
      .eq("form_id", publishedFormId);
    expect(responses.data ?? []).toHaveLength(0);
  });

  it("8. anon response-count RPC works (the cap primitive)", async () => {
    const { data, error } = await anonClient().rpc(
      "published_form_response_count",
      { p_slug: publishedSlug },
    );
    expect(error).toBeNull();
    expect(typeof data).toBe("number");
    expect(data).toBeGreaterThanOrEqual(1);
  });
});
