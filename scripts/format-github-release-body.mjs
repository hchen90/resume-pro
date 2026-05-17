import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.env.GITHUB_REF_NAME ?? process.argv[2];
const inputPath = path.join(projectRoot, "public", "release-notes.json");
const outputPath = path.join(projectRoot, "release-body.md");

if (!tag) {
  console.error("GITHUB_REF_NAME or tag argument is required.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const release = data.releases.find((entry) => entry.version === tag);

let body = `## ${release?.title ?? tag}\n\n`;

if (release?.commits?.length) {
  for (const commit of release.commits) {
    body += `- ${commit.subject} (\`${commit.shortHash}\`)\n`;
  }
} else {
  body += "_No commit list available for this release._\n";
}

fs.writeFileSync(outputPath, body);
