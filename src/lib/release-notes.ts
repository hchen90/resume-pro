import { execFileSync } from "node:child_process";

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

const gitFieldSeparator = "\u001f";
const gitRecordSeparator = "\u001e";
const fallbackVersion = `v${packageJson.version}`;

export function getCurrentVersion() {
  return (
    runGit(["describe", "--tags", "--exact-match", "HEAD"]) ??
    runGit(["describe", "--tags", "--abbrev=0"]) ??
    fallbackVersion
  );
}

export function getReleaseNotes() {
  const tags = getTagsAscending();

  return tags
    .map((tag, index) => toReleaseNote(tag, tags[index - 1]))
    .reverse();
}

export function getReleaseNote(version: string) {
  const tags = getTagsAscending();
  const normalizedVersion = normalizeVersion(version);
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
