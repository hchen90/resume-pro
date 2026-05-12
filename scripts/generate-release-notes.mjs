import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "release-notes.json");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
);

const gitFieldSeparator = "\u001f";
const gitRecordSeparator = "\u001e";
const fallbackVersion = `v${packageJson.version}`;

const data = {
  generatedAt: new Date().toISOString(),
  currentVersion: getCurrentVersion(),
  releases: getReleaseNotes(),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(
  `Generated release notes for ${data.currentVersion} at ${path.relative(
    projectRoot,
    outputPath,
  )}`,
);

function getCurrentVersion() {
  return (
    runGit(["describe", "--tags", "--exact-match", "HEAD"]) ??
    runGit(["describe", "--tags", "--abbrev=0"]) ??
    fallbackVersion
  );
}

function getReleaseNotes() {
  const tags = getTagsAscending();

  return tags
    .map((tag, index) => toReleaseNote(tag, tags[index - 1]))
    .reverse();
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
    .filter((tag) => Boolean(tag.version));
}

function toReleaseNote(tag, previousTag) {
  const range = previousTag ? `${previousTag.version}..${tag.version}` : tag.version;

  return {
    version: tag.version,
    date: tag.date,
    title: tag.title,
    commits: getCommits(range),
  };
}

function getCommits(range) {
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

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
