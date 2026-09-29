import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs"
import { join } from "path"

export const SKILL_NAME = "opencode2-skill-creator"
// Older plugin-owned skill folder names. Both were installed under the
// pre-rename names and are archived so they stop loading next to the current
// skill.
export const LEGACY_SKILL_NAME = "skill-creator"
export const LEGACY_SKILL_NAMES = ["opencode-skill-creator", "skill-creator"] as const
export const INSTALL_VERSION_FILE = ".opencode2-skill-creator-version"
// Marker written by every pre-rename install. Used to identify plugin-owned
// legacy folders without touching third-party skills.
export const LEGACY_INSTALL_VERSION_FILE = ".opencode-skill-creator-version"

export interface EnsureBundledSkillInstalledOptions {
  bundledSkillDir: string
  configDir: string
  packageVersion: string
  backupTimestamp?: () => string
  onError?: (message: string, error: unknown) => void
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

function defaultBackupTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "")
}

function uniqueBackupDir(
  skillsRoot: string,
  legacySkillName: string,
  timestamp: string,
): string {
  const base = join(
    skillsRoot,
    `${legacySkillName}.opencode2-skill-creator-backup-${timestamp}`,
  )
  if (!existsSync(base)) return base

  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${base}-${index}`
    if (!existsSync(candidate)) return candidate
  }

  throw new Error("Could not find an available legacy skill backup path")
}

function archiveLegacySkill(args: {
  skillsRoot: string
  legacySkillDir: string
  legacySkillName: string
  backupTimestamp: () => string
}): void {
  const hasMarker =
    existsSync(join(args.legacySkillDir, LEGACY_INSTALL_VERSION_FILE)) ||
    existsSync(join(args.legacySkillDir, INSTALL_VERSION_FILE))
  if (!hasMarker) return

  const backupDir = uniqueBackupDir(
    args.skillsRoot,
    args.legacySkillName,
    args.backupTimestamp(),
  )

  const backupSkillFile = join(args.legacySkillDir, "SKILL.md")
  if (existsSync(backupSkillFile)) {
    renameSync(backupSkillFile, join(args.legacySkillDir, "SKILL.md.backup"))
  }

  renameSync(args.legacySkillDir, backupDir)
}

export function ensureBundledSkillInstalled(
  options: EnsureBundledSkillInstalledOptions,
): void {
  const skillsRoot = join(options.configDir, "opencode", "skills")
  const skillsDir = join(skillsRoot, SKILL_NAME)
  const marker = join(skillsDir, "SKILL.md")
  const versionFile = join(skillsDir, INSTALL_VERSION_FILE)
  const userSkillFile = join(skillsDir, "SKILL.md")
  const userSkillBackup = join(skillsDir, "SKILL.md.user-backup")

  if (!existsSync(options.bundledSkillDir)) return

  let installedVersion = ""
  if (existsSync(versionFile)) {
    try {
      installedVersion = readFileSync(versionFile, "utf-8").trim()
    } catch {
      installedVersion = ""
    }
  }

  const shouldInstall = !existsSync(marker) || installedVersion !== options.packageVersion
  const tmpInstallDir = `${skillsDir}.tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  try {
    if (shouldInstall) {
      copyDirRecursive(options.bundledSkillDir, tmpInstallDir)

      if (existsSync(userSkillFile)) {
        try {
          copyFileSync(userSkillFile, userSkillBackup)
        } catch (error) {
          options.onError?.(
            `Failed to back up existing user skill file before updating ${SKILL_NAME}`,
            error,
          )
        }

        try {
          copyFileSync(userSkillFile, join(tmpInstallDir, "SKILL.md"))
        } catch {
          // If copy fails, continue with bundled SKILL.md.
        }
      }

      // Copy instead of rename: renaming a directory can fail with EPERM on
      // Windows while the freshly written temp directory is still being
      // scanned by the OS.
      copyDirRecursive(tmpInstallDir, skillsDir)

      writeFileSync(versionFile, `${options.packageVersion}\n`)
    }

    for (const legacySkillName of LEGACY_SKILL_NAMES) {
      const legacySkillDir = join(skillsRoot, legacySkillName)
      if (!existsSync(legacySkillDir)) continue

      archiveLegacySkill({
        skillsRoot,
        legacySkillDir,
        legacySkillName,
        backupTimestamp: options.backupTimestamp ?? defaultBackupTimestamp,
      })
    }
  } catch (error) {
    options.onError?.("Failed to install opencode2-skill-creator skill", error)
  } finally {
    if (existsSync(tmpInstallDir)) {
      rmSync(tmpInstallDir, { recursive: true, force: true })
    }
  }
}
