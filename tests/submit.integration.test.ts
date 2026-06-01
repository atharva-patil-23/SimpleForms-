/**
 * Submit handler tests (ENGINEERING_PLAN T4 / test plan): valid 200, Zod-fail
 * 400, unpublished denied, unknown-qid rejected, double-submit works. Exercises
 * the real trust-boundary core (lib/submit.ts) against a local supabase anon
 * client, so RLS is genuinely in the loop.
 *
 * Run: `supabase start` then `npm test`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { handleSubmit } from "@/lib/submit";
import { __resetRateLimit } from "@/lib/rate-limit";
import {
  anonClient,
  serviceClient,
  createUserClient,
  uniqueEmail,
} from "./helpers/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const schema = [
  { id: "name", type: "short_text", title: "Your name", required: true },
  { id: "email", type: "email", title: "Email", required: true },
];

let admin: SupabaseClient;
let ownerId: string;
let publishedSlug: string;
let draftSlug: string;

beforeAll(async () => {
  admin = serviceClient();
  const owner = await createUserClient(uniqueEmail("submit-owner"));
  ownerId = owner.userId;

  publishedSlug = `sub-pub-${Date.now()}`;
  draftSlug = `sub-draft-${Date.now()}`;

  await admin.from("forms").insert([
    {
      owner_id: ownerId,
      title: "Published",
      schema,
      status: "published",
      public_slug: publishedSlug,
    },
    {
      owner_id: ownerId,
      title: "Draft",
      schema,
      status: "draft",
      public_slug: draftSlug,
    },
  ]);
});

afterAll(async () => {
  await admin.from("forms").delete().eq("owner_id", ownerId);
});

function freshKey() {
  // Unique rate-limit key per call so the limiter never trips in these tests.
  __resetRateLimit();
  return `test-${Math.random()}`;
}

describe("handleSubmit — the trust boundary", () => {
  it("accepts a valid submission (201)", async () => {
    const res = await handleSubmit(anonClient(), {
      slug: publishedSlug,
      rateLimitKey: freshKey(),
      userAgent: "vitest",
      answers: { name: "Ada", email: "ada@example.com" },
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  it("rejects invalid answers with 400 + field errors", async () => {
    const res = await handleSubmit(anonClient(), {
      slug: publishedSlug,
      rateLimitKey: freshKey(),
      userAgent: "vitest",
      answers: { name: "", email: "not-an-email" },
    });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toBeDefined();
  });

  it("rejects unknown question ids (no smuggling)", async () => {
    const res = await handleSubmit(anonClient(), {
      slug: publishedSlug,
      rateLimitKey: freshKey(),
      userAgent: "vitest",
      answers: { name: "Ada", email: "ada@example.com", evil: "x" },
    });
    expect(res.status).toBe(400);
  });

  it("treats a draft form as closed (404 — anon can't see it)", async () => {
    const res = await handleSubmit(anonClient(), {
      slug: draftSlug,
      rateLimitKey: freshKey(),
      userAgent: "vitest",
      answers: { name: "Ada", email: "ada@example.com" },
    });
    expect(res.status).toBe(404);
  });

  it("treats an unknown slug as closed (404)", async () => {
    const res = await handleSubmit(anonClient(), {
      slug: "does-not-exist",
      rateLimitKey: freshKey(),
      userAgent: "vitest",
      answers: { name: "Ada", email: "ada@example.com" },
    });
    expect(res.status).toBe(404);
  });

  it("allows a second submission (no accidental dedup)", async () => {
    const first = await handleSubmit(anonClient(), {
      slug: publishedSlug,
      rateLimitKey: freshKey(),
      userAgent: "vitest",
      answers: { name: "Grace", email: "grace@example.com" },
    });
    const second = await handleSubmit(anonClient(), {
      slug: publishedSlug,
      rateLimitKey: freshKey(),
      userAgent: "vitest",
      answers: { name: "Grace", email: "grace@example.com" },
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it("rate-limits a flood from one key (429)", async () => {
    __resetRateLimit();
    const key = `flood-${Math.random()}`;
    let last = 0;
    for (let i = 0; i < 15; i++) {
      const res = await handleSubmit(anonClient(), {
        slug: publishedSlug,
        rateLimitKey: key,
        userAgent: "vitest",
        answers: { name: "Flood", email: "flood@example.com" },
      });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
