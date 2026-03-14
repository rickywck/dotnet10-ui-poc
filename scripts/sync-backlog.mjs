import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

// --------------------------
// CONFIG
// --------------------------
const BACKLOG_DIR = "./backlog"; // folder with your MD files
const GITHUB_OWNER = "rickywck"; // your GitHub username/org
const GITHUB_REPO = "dotnet10-ui-poc"; // repo name
const GITHUB_TOKEN = process.env.GH_PAT;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --------------------------
// HELPERS
// --------------------------

// Insert GitHub issue number after feature header
function insertFeatureIssue(mdLine, issueNumber) {
  if (mdLine.includes(`<!-- github-issue:`)) return mdLine;
  return `${mdLine}\n<!-- github-issue: ${issueNumber} -->`;
}

// Insert GitHub issue number after story header
function insertStoryIssue(mdLine, issueNumber) {
  if (mdLine.includes(`<!-- github-issue:`)) return mdLine;
  return `${mdLine}\n<!-- github-issue: ${issueNumber} -->`;
}

// Extract issue number from header, scanning next few lines if necessary
function getIssueNumber(mdLines, index) {
  for (let offset = 0; offset <= 3; offset++) {
    const line = mdLines[index + offset] || "";
    const match = line.match(/<!-- github-issue:\s*(\d+) -->/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// Extract feature body: lines after header until next header (# Feature or ###)
function extractFeatureBody(mdLines, startIndex) {
  const bodyLines = [];
  for (let i = startIndex + 1; i < mdLines.length; i++) {
    const line = mdLines[i];
    if (line.startsWith("# Feature:") || line.startsWith("### ")) break;
    bodyLines.push(line);
  }
  return bodyLines.join("\n").trim();
}

// --------------------------
// GITHUB API
// --------------------------

async function createIssue(title, body, labels = []) {
  const res = await octokit.issues.create({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    title,
    body,
    labels,
  });
  return res.data.number;
}

async function updateIssue(number, title, body) {
  await octokit.issues.update({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    issue_number: number,
    title,
    body,
  });
}

// --------------------------
// PROCESS FILE
// --------------------------

async function processFile(filePath) {
  let md = fs.readFileSync(filePath, "utf-8");
  const mdLines = md.split("\n");
  const updatedMD = [];
  let i = 0;

  while (i < mdLines.length) {
    let line = mdLines[i];

    if (line.startsWith("# Feature:")) {
      const featureTitle = line.replace("# Feature:", "").trim();
      const featureBody = extractFeatureBody(mdLines, i);

      // Create/update feature issue
      let featureIssueNumber = getIssueNumber(mdLines, i);
      if (!featureIssueNumber) {
        featureIssueNumber = await createIssue(
          `Feature: ${featureTitle}`,
          featureBody,
          ["feature"]
        );
        line = insertFeatureIssue(line, featureIssueNumber);
        console.log(`Created feature issue #${featureIssueNumber}`);
      } else {
        await updateIssue(featureIssueNumber, `Feature: ${featureTitle}`, featureBody);
        console.log(`Updated feature issue #${featureIssueNumber}`);
      }

      updatedMD.push(line);
      i++;

      // Process user stories under this feature
      while (i < mdLines.length && !mdLines[i].startsWith("# Feature:")) {
        let storyLine = mdLines[i];

        if (storyLine.startsWith("### ")) {
          const storyTitle = storyLine.replace("###", "").trim();

          // Collect story body
          const storyBodyLines = [];
          let j = i + 1;
          while (
            j < mdLines.length &&
            !mdLines[j].startsWith("### ") &&
            !mdLines[j].startsWith("# Feature:")
          ) {
            storyBodyLines.push(mdLines[j]);
            j++;
          }
          const storyBody = storyBodyLines.join("\n").trim();

          // Create/update story issue
          let storyIssueNumber = getIssueNumber(mdLines, i);
          if (!storyIssueNumber) {
            storyIssueNumber = await createIssue(
              storyTitle,
              `${storyBody}\n\nParent Feature: #${featureIssueNumber}`,
              ["user-story"]
            );
            storyLine = insertStoryIssue(storyLine, storyIssueNumber);
            console.log(`Created story issue #${storyIssueNumber}`);
          } else {
            await updateIssue(
              storyIssueNumber,
              storyTitle,
              `${storyBody}\n\nParent Feature: #${featureIssueNumber}`
            );
            console.log(`Updated story issue #${storyIssueNumber}`);
          }

          updatedMD.push(storyLine);
          updatedMD.push(...storyBodyLines);
          i = j;
        } else {
          updatedMD.push(mdLines[i]);
          i++;
        }
      }
    } else {
      updatedMD.push(line);
      i++;
    }
  }

  // Write back updated MD file
  fs.writeFileSync(filePath, updatedMD.join("\n"), "utf-8");
  console.log(`Updated MD file: ${filePath}`);
}

// --------------------------
// MAIN
// --------------------------

async function main() {
  try {
    const files = fs.readdirSync(BACKLOG_DIR).filter((f) => f.endsWith(".md"));
    console.log("Found backlog files:", files);

    for (const file of files) {
      const filePath = path.join(BACKLOG_DIR, file);
      await processFile(filePath);
    }
  } catch (err) {
    console.error("Backlog sync failed:", err);
    process.exit(1);
  }
}

main();