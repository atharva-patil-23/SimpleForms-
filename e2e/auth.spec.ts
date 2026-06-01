/**
 * Auth gating + cross-user isolation (ENGINEERING_PLAN T12). Includes the
 * permanent guard for the leak found by dogfooding: a creator must never see
 * or open another creator's form, even when it's published (published forms are
 * visible at the RLS layer; the app scopes by owner_id).
 */
import { test, expect } from "@playwright/test";
import { createCreator, applySession, serviceClient } from "./helpers/auth";

test("unauthenticated visit to /dashboard redirects to /login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login(\?.*)?$/);
  await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
});

test("a creator cannot see or open another creator's published form", async ({
  page,
}) => {
  // userA owns a published form (seeded via service role for speed).
  const userA = await createCreator("iso-a");
  const userB = await createCreator("iso-b");
  const admin = serviceClient();
  const { data: form } = await admin
    .from("forms")
    .insert({
      owner_id: userA.userId,
      title: "Private to A",
      schema: [{ id: "q1", type: "short_text", title: "Secret", required: true }],
      status: "published",
      public_slug: `iso-${Date.now()}`,
    })
    .select("id")
    .single();

  // userB signs in.
  await applySession(page.context(), userB);

  // Dashboard: A's form must NOT appear.
  await page.goto("/dashboard");
  await expect(page.getByText("Private to A")).toHaveCount(0);

  // Direct editor URL for A's form: not-found for userB.
  await page.goto(`/forms/${form!.id}`);
  await expect(page.getByText(/could not be found|isn’t here|404/i).first()).toBeVisible();

  // Direct results URL for A's form: not-found for userB.
  await page.goto(`/forms/${form!.id}/results`);
  await expect(page.getByText(/could not be found|isn’t here|404/i).first()).toBeVisible();

  await admin.from("forms").delete().eq("id", form!.id);
});
