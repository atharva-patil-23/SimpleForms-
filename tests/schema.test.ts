/**
 * Zod schema tests (ENGINEERING_PLAN test plan: "every question type good/bad,
 * runtime answer-validator from stored schema"). These run with zero
 * infrastructure — pure validation logic.
 */
import { describe, it, expect } from "vitest";
import {
  parseFormSchema,
  buildAnswerValidator,
  type Question,
} from "@/lib/schema";

describe("FormSchema (builder-side question definitions)", () => {
  it("accepts a valid mixed-type form", () => {
    const questions = parseFormSchema([
      { id: "name", type: "short_text", title: "Your name", required: true },
      { id: "email", type: "email", title: "Email", required: true },
      {
        id: "roast",
        type: "single_select",
        title: "Pick your roast",
        required: false,
        options: [{ label: "Light" }, { label: "Dark" }],
      },
    ]);
    expect(questions).toHaveLength(3);
  });

  it("rejects a select question with no options", () => {
    expect(() =>
      parseFormSchema([
        { id: "x", type: "single_select", title: "Pick", options: [] },
      ]),
    ).toThrow();
  });

  it("rejects duplicate question ids", () => {
    expect(() =>
      parseFormSchema([
        { id: "dup", type: "short_text", title: "A" },
        { id: "dup", type: "short_text", title: "B" },
      ]),
    ).toThrow(/duplicate question id/);
  });

  it("rejects a non-url-safe question id", () => {
    expect(() =>
      parseFormSchema([{ id: "has space", type: "short_text", title: "A" }]),
    ).toThrow();
  });

  it("rejects an empty question title", () => {
    expect(() =>
      parseFormSchema([{ id: "a", type: "short_text", title: "" }]),
    ).toThrow();
  });
});

describe("buildAnswerValidator (runtime, per-form)", () => {
  const questions: Question[] = parseFormSchema([
    { id: "name", type: "short_text", title: "Name", required: true },
    { id: "bio", type: "long_text", title: "Bio", required: false },
    { id: "email", type: "email", title: "Email", required: true },
    { id: "age", type: "number", title: "Age", required: false, min: 0, max: 120 },
    { id: "agree", type: "yes_no", title: "Agree?", required: true },
    {
      id: "roast",
      type: "single_select",
      title: "Roast",
      required: true,
      options: [{ label: "Light" }, { label: "Medium" }, { label: "Dark" }],
    },
    {
      id: "tags",
      type: "multi_select",
      title: "Tags",
      required: false,
      options: [{ label: "A" }, { label: "B" }, { label: "C" }],
      maxSelections: 2,
    },
  ]);
  const v = buildAnswerValidator(questions);

  it("accepts a fully valid answer set", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: true,
      roast: "Dark",
      tags: ["A", "B"],
    });
    expect(res.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const res = v.safeParse({ email: "ada@example.com", agree: true, roast: "Dark" });
    expect(res.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "not-an-email",
      agree: true,
      roast: "Dark",
    });
    expect(res.success).toBe(false);
  });

  it("enforces number range", () => {
    const tooOld = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: true,
      roast: "Dark",
      age: 999,
    });
    expect(tooOld.success).toBe(false);
  });

  it("rejects a select value that isn't an option", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: true,
      roast: "Burnt",
    });
    expect(res.success).toBe(false);
  });

  it("rejects a multi-select with an unknown option", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: true,
      roast: "Dark",
      tags: ["A", "Z"],
    });
    expect(res.success).toBe(false);
  });

  it("enforces multi-select maxSelections", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: true,
      roast: "Dark",
      tags: ["A", "B", "C"],
    });
    expect(res.success).toBe(false);
  });

  it("rejects unknown answer keys (no smuggling)", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: true,
      roast: "Dark",
      not_a_question: "haxx",
    });
    expect(res.success).toBe(false);
  });

  it("allows omitting an optional empty field", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: true,
      roast: "Dark",
      bio: "",
    });
    expect(res.success).toBe(true);
  });

  it("yes_no must be a boolean, not a string", () => {
    const res = v.safeParse({
      name: "Ada",
      email: "ada@example.com",
      agree: "yes",
      roast: "Dark",
    });
    expect(res.success).toBe(false);
  });
});
