import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import packageJson from "../../package.json";

export type ReleaseCommit = {
  hash: string;
  shortHash: string;
  date: string;
  subject: string;
};

export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  commits: ReleaseCommit[];
};

type GitTag = {
  version: string;
  date: string;
  title: string;
};

type ReleaseNotesData = {
  generatedAt?: string;
  currentVersion: string;
  releases: ReleaseNote[];
};

const gitFieldSeparator = "\u001f";
const gitRecordSeparator = "\u001e";
const fallbackVersion = `v${packageJson.version}`;
const generatedReleaseNotesPath = path.join("public", "release-notes.json");

export function getCurrentVersion() {
  const data = readGeneratedReleaseNotes();

  if (data) {
    return data.currentVersion;
  }

  return (
    runGit(["describe", "--tags", "--exact-match", "HEAD"]) ??
    runGit(["describe", "--tags", "--abbrev=0"]) ??
    fallbackVersion
  );
}

export function getReleaseNotes() {
  const data = readGeneratedReleaseNotes();

  if (data) {
    return data.releases;
  }

  const tags = getTagsAscending();

  return tags
    .map((tag, index) => toReleaseNote(tag, tags[index - 1]))
    .reverse();
}

export function getReleaseNote(version: string) {
  const data = readGeneratedReleaseNotes();
  const normalizedVersion = normalizeVersion(version);

  if (data) {
    return (
      data.releases.find((release) => release.version === normalizedVersion) ?? null
    );
  }

  const tags = getTagsAscending();
  const index = tags.findIndex((tag) => tag.version === normalizedVersion);

  if (index === -1) {
    return null;
  }

  return toReleaseNote(tags[index], tags[index - 1]);
}

function getTagsAscending() {
  const output = runGit([
    "for-each-ref",
    "--sort=creatordate",
    "--format=%(refname:short)%09%(creatordate:short)%09%(subject)",
    "refs/tags",
  ]);

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => {
      const [version, date, ...titleParts] = line.split("\t");

      return {
        version,
        date,
        title: titleParts.join("\t") || version,
      };
    })
    .filter((tag): tag is GitTag => Boolean(tag.version));
}

function toReleaseNote(tag: GitTag, previousTag?: GitTag): ReleaseNote {
  const range = previousTag ? `${previousTag.version}..${tag.version}` : tag.version;

  return {
    version: tag.version,
    date: tag.date,
    title: tag.title,
    commits: getCommits(range),
  };
}

function getCommits(range: string): ReleaseCommit[] {
  const output = runGit([
    "log",
    "--date=short",
    `--format=%H%x1f%h%x1f%ad%x1f%s%x1e`,
    range,
    "--",
  ]);

  if (!output) {
    return [];
  }

  return output
    .split(gitRecordSeparator)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, shortHash, date, subject] = record.split(gitFieldSeparator);

      return {
        hash,
        shortHash,
        date,
        subject,
      };
    })
    .filter((commit) => Boolean(commit.hash));
}

function normalizeVersion(version: string) {
  const decodedVersion = decodeURIComponent(version).trim();

  return decodedVersion.startsWith("v") ? decodedVersion : `v${decodedVersion}`;
}

function runGit(args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readGeneratedReleaseNotes() {
  for (const filePath of getGeneratedReleaseNotesPaths()) {
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const data = JSON.parse(
        fs.readFileSync(filePath, "utf8"),
      ) as Partial<ReleaseNotesData>;

      if (isReleaseNotesData(data)) {
        return data;
      }
    } catch {
      // Ignore invalid generated data and fall back to git in development.
    }
  }

  return null;
}

function getGeneratedReleaseNotesPaths() {
  const paths = [
    process.env.RELEASE_NOTES_PATH,
    path.join(process.cwd(), generatedReleaseNotesPath),
    path.join(process.cwd(), ".next", "standalone", generatedReleaseNotesPath),
  ];

  return paths.filter((filePath): filePath is string => Boolean(filePath));
}

function isReleaseNotesData(
  data: Partial<ReleaseNotesData>,
): data is ReleaseNotesData {
  return (
    typeof data.currentVersion === "string" &&
    Array.isArray(data.releases) &&
    data.releases.every(isReleaseNote)
  );
}

function isReleaseNote(release: unknown): release is ReleaseNote {
  if (!release || typeof release !== "object") {
    return false;
  }

  const candidate = release as Partial<ReleaseNote>;

  return (
    typeof candidate.version === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.commits) &&
    candidate.commits.every(isReleaseCommit)
  );
}

function isReleaseCommit(commit: unknown): commit is ReleaseCommit {
  if (!commit || typeof commit !== "object") {
    return false;
  }

  const candidate = commit as Partial<ReleaseCommit>;

  return (
    typeof candidate.hash === "string" &&
    typeof candidate.shortHash === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.subject === "string"
  );
}
