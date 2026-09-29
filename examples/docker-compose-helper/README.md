# Docker Compose Helper Example

This is a complete, lightweight example of the eval-driven skill workflow:
write a small skill, test whether its description triggers on the right
queries, optimize the description, then benchmark real task output if needed.

## Files

- `SKILL.md` - the example skill
- `evals/eval-set.json` - trigger evals consumed by `skill_eval`

The eval file is a JSON array of `{ "query": string, "should_trigger": boolean }`
items. That matches the `EvalItem` interface used by the plugin.

## Run A Trigger Eval

In OpenCode, ask:

```text
Use opencode2-skill-creator to run skill_eval on examples/docker-compose-helper with examples/docker-compose-helper/evals/eval-set.json.
Use runsPerQuery 3 and triggerThreshold 0.5.
```

Equivalent tool arguments:

```text
skill_eval:
  skillPath: examples/docker-compose-helper
  evalSetPath: examples/docker-compose-helper/evals/eval-set.json
  runsPerQuery: 3
  triggerThreshold: 0.5
```

Expected output: JSON with one result per query. Positive queries pass when the
skill triggers in at least 50% of successful runs; negative queries pass when it
triggers in less than 50%. With the defaults above, each query runs 3 times.

## Optimize The Description

Ask:

```text
Use opencode2-skill-creator to run skill_optimize_loop for examples/docker-compose-helper using examples/docker-compose-helper/evals/eval-set.json.
Use maxIterations 5, runsPerQuery 3, triggerThreshold 0.5.
```

Equivalent tool arguments:

```text
skill_optimize_loop:
  skillPath: examples/docker-compose-helper
  evalSetPath: examples/docker-compose-helper/evals/eval-set.json
  maxIterations: 5
  runsPerQuery: 3
  triggerThreshold: 0.5
```

Expected output: JSON containing the best description found, train/test scores,
and per-query trigger rates. Copy `best_description` into the frontmatter only
if it improves held-out test behavior and still reads clearly.

## Benchmark Real Output

Trigger evals only test whether OpenCode chooses the skill. To compare task
quality, run paired task outputs with and without the skill, then ask:

```text
Use opencode2-skill-creator to run skill_aggregate_benchmark for my eval workspace, then open the review viewer.
```

Expected output: `benchmark.json`, `benchmark.md`, and a review viewer showing
pass rates, timing, tokens, and side-by-side run outputs.
