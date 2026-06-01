/**
 * The full loop (ENGINEERING_PLAN T12): create -> publish -> fill -> submit ->
 * results, driven entirely through the real UI. The creator half runs in an
 * authenticated context; the respondent half runs in a fresh anonymous context
 * (no session), exactly like a real share link.
 */
import { test, expect } from "@playwright/test";
import { createCreator, applySession } from "./helpers/auth";

test("create → publish → fill → submit → results", async ({ page, browser }) => {
  const creator = await createCreator("loop");
  await applySession(page.context(), creator);

  // --- creator: dashboard starts empty -----------------------------------
  await page.goto("/dashboard");
  await expect(page.getByText("No forms yet.")).toBeVisible();

  // --- creator: create a form --------------------------------------------
  await page.getByRole("button", { name: "+ New form" }).first().click();
  await page.waitForURL(/\/forms\/[0-9a-f-]+$/);

  // Title.
  const title = page.getByPlaceholder("Untitled form");
  await title.fill("Beta Waitlist");

  // Add a short-text question via the "/" add menu.
  await page.getByRole("button", { name: /to add a question/ }).click();
  await page.getByRole("button", { name: "Short text" }).click();
  await page.getByPlaceholder("Ask a question…").first().fill("What's your name?");

  // Add an email question.
  await page.getByRole("button", { name: /to add a question/ }).click();
  await page.getByRole("button", { name: "Email" }).click();
  await page.getByPlaceholder("Ask a question…").nth(1).fill("Your email");

  // --- creator: publish ---------------------------------------------------
  await page.getByRole("button", { name: /Publish/ }).click();
  const shareLink = page.locator('a[href*="/f/"]');
  await expect(shareLink).toBeVisible();
  const href = await shareLink.getAttribute("href");
  const slug = href!.split("/f/")[1];
  expect(slug).toMatch(/^[0-9a-z]{18}$/);

  // --- respondent: fill in a FRESH anonymous context ----------------------
  const anon = await browser.newContext();
  const fill = await anon.newPage();
  await fill.goto(`/f/${slug}`);

  await expect(fill.getByRole("heading", { name: "What's your name?" })).toBeVisible();
  await fill.getByPlaceholder("Type your answer").fill("Ada Lovelace");
  await fill.getByRole("button", { name: /Continue/ }).click();

  await expect(fill.getByRole("heading", { name: "Your email" })).toBeVisible();
  await fill.getByPlaceholder("name@email.com").fill("ada@example.com");
  await fill.getByRole("button", { name: /Submit/ }).click();

  await expect(fill.getByText(/submitted/i)).toBeVisible();
  await anon.close();

  // --- creator: results show the response ---------------------------------
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Results" }).first().click();
  await page.waitForURL(/\/results$/);

  await expect(page.getByText("1 response")).toBeVisible();
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await expect(page.getByText("ada@example.com")).toBeVisible();
});
