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
function insertFeatureIssue(mdBlock, issueNumber) {
  if (mdBlock.includes(`<!-- github-issue:`)) return mdBlock;
  return mdBlock.replace(/(# Feature:.*)/, `$1\n\n<!-- github-issue: ${issueNumber} -->`);
}

// Insert GitHub issue number after story header
function insertStoryIssue(mdBlock, storyTitle, issueNumber) {
  const regex = new RegExp(`(###\\s*${storyTitle}\\s*)`);
  if (mdBlock.includes(`<!-- github-issue: ${issueNumber} -->`)) return mdBlock;
  return mdBlock.replace(regex, `$1\n\n<!-- github-issue: ${issueNumber} -->`);
}

// Extract issue number from a block
function getIssueNumber(mdBlock) {
  const match = mdBlock.match(/<!-- github-issue: (\d+) -->/);
  return match ? parseInt(match[1], 10) : null;
}

// Extract only the body of a feature (up to next feature header)
function extractFeatureBody(featureBlock) {
  const nextFeatureIndex = featureBlock.search(/^# Feature:/m);
  if (nextFeatureIndex > 0) {
    return featureBlock.slice(0, nextFeatureIndex).trim();
  }
  return featureBlock.trim();
}

// --------------------------
// GitHub API
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
// PARSING & PROCESSING
// --------------------------

async function processFile(filePath) {
  let md = fs.readFileSync(filePath, "utf-8");

  // Split file into features
  const featureBlocks = md.split(/^# Feature:/m);
  let updatedMD = featureBlocks[0]; // content before first feature

  for (let i = 1; i < featureBlocks.length; i++) {
    let block = "# Feature:" + featureBlocks[i]; // restore header
    const lines = block.split("\n");
    const featureTitle = lines[0].replace("# Feature:", "").trim();
    let featureBody = lines.slice(1).join("\n");

    // Only include lines up to next feature
    featureBody = extractFeatureBody(featureBody);

    // Feature issue
    let featureIssue = getIssueNumber(block);
    if (!featureIssue) {
      featureIssue = await createIssue(`Feature: ${featureTitle}`, featureBody, ["feature"]);
      block = insertFeatureIssue(block, featureIssue);
      console.log(`Created feature issue #${featureIssue}`);
    } else {
      await updateIssue(featureIssue, `Feature: ${featureTitle}`, featureBody);
      console.log(`Updated feature issue #${featureIssue}`);
    }

    // Split stories
    const storyBlocks = block.split(/^### /m);
    let updatedBlock = storyBlocks[0]; // before first story

    for (let j = 1; j < storyBlocks.length; j++) {
      let storyBlock = "### " + storyBlocks[j];
      const storyLines = storyBlock.split("\n");
      const storyTitle = storyLines[0].replace("###", "").trim();
      const storyBody = storyLines.slice(1).join("\n");

      let storyIssue = getIssueNumber(storyBlock);
      if (!storyIssue) {
        storyIssue = await createIssue(
          storyTitle,
          `${storyBody}\nParent Feature: #${featureIssue}`,
          ["user-story"]
        );
        storyBlock = insertStoryIssue(storyBlock, storyTitle, storyIssue);
        console.log(`Created story issue #${storyIssue}`);
      } else {
        await updateIssue(
          storyIssue,
          storyTitle,
          `${storyBody}\nParent Feature: #${featureIssue}`
        );
        console.log(`Updated story issue #${storyIssue}`);
      }

      updatedBlock += storyBlock;
    }

    updatedMD += updatedBlock;
  }

  fs.writeFileSync(filePath, updatedMD, "utf-8");
  console.log(`Updated MD file: ${filePath}`);
}

// --------------------------
// MAIN
// --------------------------

async function main() {
  try {
    const files = fs.readdirSync(BACKLOG_DIR).filter(f => f.endsWith(".md"));
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