import { expect, test } from "bun:test"

import { findSkillConflicts } from "../lib/run-eval"

test("findSkillConflicts returns paths for matching skills", () => {
  expect(
    findSkillConflicts(
      [
        { name: "other-skill", path: "/tmp/other" },
        { name: "target-skill", path: "/tmp/target" },
      ],
      "target-skill",
    ),
  ).toEqual(["/tmp/target"])
})

test("findSkillConflicts uses unknown location when matching entry has no path", () => {
  expect(findSkillConflicts([{ name: "target-skill" }], "target-skill")).toEqual([
    "unknown location",
  ])
})

test("findSkillConflicts returns empty array when there is no match", () => {
  expect(
    findSkillConflicts([{ name: "other-skill", path: "/tmp/other" }], "target-skill"),
  ).toEqual([])
})

test("findSkillConflicts returns empty array for non-array input", () => {
  expect(findSkillConflicts(undefined as never, "target-skill")).toEqual([])
})
