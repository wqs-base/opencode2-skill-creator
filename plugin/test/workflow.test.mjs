import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

const publishWorkflowPath = fileURLToPath(
  new URL("../../.github/workflows/publish.yml", import.meta.url),
)

function extractNpmVersionCheck(workflow) {
  const scriptLine = workflow
    .split("\n")
    .find((line) => line.includes("node -e") && line.includes("$NPM_VERSION"))
  const match = scriptLine?.match(/node -e '([^']+)' "\$NPM_VERSION"/)
  assert.ok(match, "expected npm version check script")
  return match[1]
}

function runVersionCheck(script, version) {
  try {
    execFileSync(process.execPath, ["-e", script, version], {
      stdio: "pipe",
      timeout: 1_000,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, stderr: String(error.stderr) }
  }
}

test("publish workflow prepares dependencies required by prepack", () => {
  const workflow = readFileSync(publishWorkflowPath, "utf-8")

  assert.match(workflow, /oven-sh\/setup-bun@v\d+/)
  assert.match(workflow, /working-directory:\s*plugin\s+run:\s*npm install/s)
  assert.match(workflow, /run:\s*npm publish --access public\s+working-directory:\s*plugin/s)
})

test("publish workflow publishes with the NPM_TOKEN secret", () => {
  const workflow = readFileSync(publishWorkflowPath, "utf-8")

  assert.match(workflow, /permissions:\s+contents:\s*write/)
  assert.doesNotMatch(workflow, /id-token/)
  assert.match(workflow, /run:\s*npm install -g npm@latest/)
  assert.match(workflow, /NPM_VERSION=\$\(npm --version\)/)
  assert.match(workflow, /npm is too old/)
  assert.match(workflow, /forks and non-main refs cannot publish/)
  assert.match(
    workflow,
    /if:\s*steps\.npm\.outputs\.exists != 'true' && github\.repository == 'wqs-base\/opencode2-skill-creator' && github\.ref == 'refs\/heads\/main'\s+run:\s*npm publish --access public/s,
  )
  assert.match(workflow, /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/)
  assert.doesNotMatch(workflow, /--provenance/)
})

test("publish workflow rejects incomplete npm versions for the npm CLI version check", () => {
  const workflow = readFileSync(publishWorkflowPath, "utf-8")
  const script = extractNpmVersionCheck(workflow)

  assert.doesNotMatch(script, /require|import|eval|Function|child_process/)

  assert.equal(runVersionCheck(script, "11").ok, false)
  assert.equal(runVersionCheck(script, "11.5").ok, false)
  assert.equal(runVersionCheck(script, "11.5.0").ok, false)
  assert.equal(runVersionCheck(script, "11.5.1a").ok, false)
  assert.equal(runVersionCheck(script, "11.5.a").ok, false)
  assert.equal(runVersionCheck(script, "11.5.1.0").ok, false)
  assert.equal(runVersionCheck(script, "").ok, false)
  assert.equal(runVersionCheck(script, "11.5.1").ok, true)
  assert.equal(runVersionCheck(script, "12.0.0").ok, true)
})
