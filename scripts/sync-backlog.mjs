import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

// --------------------------
// CONFIGURATION
// --------------------------

const BACKLOG_DIR = "./backlog"; // your MD files directory
const GITHUB_OWNER = "rickywck"; // your GitHub username/org
const GITHUB_REPO = "dotnet10-ui-poc"; // your repository
const GITHUB_TOKEN = process.env.GH_PAT;

// --------------------------
// GITHUB CLIENT
// --------------------------

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --------------------------
// UTILITY FUNCTIONS
// --------------------------

// Insert feature issue number after feature header
function insertIssueNumber(md, issueNumber) {
  if (md.includes("<!-- github-issue:")) return md;
  return md.replace(
    /(# Feature:[^\n]*\n)/,
    `$1<!-- github-issue: ${issueNumber} -->\n`
  );
}

// Insert user story issue number after the story header
function insertStoryIssueNumber(md, storyTitle, issueNumber) {
  const regex = new RegExp(`(### ${storyTitle}\\n)(?!<!-- github-issue)`, "m");
  return md.replace(regex, `$1<!-- github-issue: ${issueNumber} -->\n`);
}

// Extract existing issue number from markdown for a block
function getIssueNumber(mdBlock) {
  const match = mdBlock.match(/<!-- github-issue: (\d+) -->/);
  return match ? parseInt(match[1], 10) : null;
}

// Create a GitHub issue
async function createIssue(title, body, labels = []) {
  const response = await octokit.issues.create({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    title,
    body,
    labels,
  });
  return response.data.number;
}

// Update an existing GitHub issue
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
// PARSING FUNCTIONS
// --------------------------

// Parse markdown file into features and stories
function parseMD(content) {
  const features = [];
  const featureBlocks = content.split(/^# Feature:/m).slice(1);
  for (const block of featureBlocks) {
    const lines = block.trim().split("\n");
    const featureTitle = lines[0].trim();
    const featureBody = lines.slice(1).join("\n");

    // Extract user stories
    const stories = [];
    const storyBlocks = featureBody.split(/^### /m).slice(1);
    for (const sb of storyBlocks) {
      const storyLines = sb.trim().split("\n");
      const storyTitle = storyLines[0].trim();
      const storyBody = storyLines.slice(1).join("\n");
      stories.push({ title: storyTitle, body: storyBody, raw: sb });
    }

    features.push({ title: featureTitle, body: featureBody, stories });
  }
  return features;
}

// --------------------------
// PROCESS SINGLE FILE
// --------------------------

async function processFile(filePath) {
  let md = fs.readFileSync(filePath, "utf-8");
  const features = parseMD(md);

  for (const feature of features) {
    let featureIssue = getIssueNumber(md);
    const featureBody = feature.body + "\n";

    if (!featureIssue) {
      featureIssue = await createIssue(
        `Feature: ${feature.title}`,
        featureBody,
        ["feature"]
      );
      md = insertIssueNumber(md, featureIssue);
      console.log(`Created feature issue #${featureIssue}`);
    } else {
      await updateIssue(featureIssue, `Feature: ${feature.title}`, featureBody);
      console.log(`Updated feature issue #${featureIssue}`);
    }

    // Process user stories
    for (const story of feature.stories) {
      let storyIssue = getIssueNumber(story.raw);
      const storyBody = story.body + `\nParent Feature: #${featureIssue}`;

      if (!storyIssue) {
        storyIssue = await createIssue(story.title, storyBody, ["user-story"]);
        md = insertStoryIssueNumber(md, story.title, storyIssue);
        console.log(`Created story issue #${storyIssue}`);
      } else {
        await updateIssue(storyIssue, story.title, storyBody);
        console.log(`Updated story issue #${storyIssue}`);
      }
    }
  }

  // Write back updated markdown
  fs.writeFileSync(filePath, md, "utf-8");
  console.log(`Updated file: ${filePath}`);
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