#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

const owner = "rickywck";
const repo = "dotnet10-ui-poc";

const octokit = new Octokit({
  auth: process.env.GH_PAT
});

const backlogDir = path.join(process.cwd(), "backlog");

function getIssueNumber(text) {
  const m = text.match(/<!--\s*github-issue:\s*(\d+)\s*-->/);
  return m ? parseInt(m[1]) : null;
}

function insertStoryIssueNumber(md, storyTitle, issueNumber) {

  const regex = new RegExp(
    `(### ${storyTitle}\\n)(?!<!-- github-issue)`,
    "m"
  );

  return md.replace(
    regex,
    `$1<!-- github-issue: ${issueNumber} -->\n`
  );
}

function parseMarkdown(md) {

  const sections = md.split("\n");

  let featureTitle = "";
  let featureBody = "";
  let stories = [];

  let currentStory = null;

  for (let line of sections) {

    if (line.startsWith("# Feature:")) {
      featureTitle = line.replace("# Feature:", "").trim();
    }

    else if (line.startsWith("### ")) {

      if (currentStory) stories.push(currentStory);

      currentStory = {
        title: line.replace("### ", "").trim(),
        body: "",
        raw: line + "\n"
      };
    }

    else {

      if (currentStory) {
        currentStory.body += line + "\n";
        currentStory.raw += line + "\n";
      } else {
        featureBody += line + "\n";
      }
    }
  }

  if (currentStory) stories.push(currentStory);

  return {
    featureTitle,
    featureBody,
    stories
  };
}

async function createIssue(title, body, labels = []) {

  const res = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels
  });

  return res.data.number;
}

async function updateIssue(issueNumber, title, body) {

  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    title,
    body
  });
}

async function processFile(filePath) {

  let md = fs.readFileSync(filePath, "utf8");

  const { featureTitle, featureBody, stories } = parseMarkdown(md);

  let featureIssue = getIssueNumber(md);

  if (!featureIssue) {

    featureIssue = await createIssue(
      `Feature: ${featureTitle}`,
      featureBody,
      ["feature"]
    );

    md = insertIssueNumber(md, featureIssue);
  }
  else {

    await updateIssue(
      featureIssue,
      `Feature: ${featureTitle}`,
      featureBody
    );
  }

for (const story of stories) {

  const storyIssue = getIssueNumber(story.raw);

  const storyTitle = story.title;
  const storyBody = story.body + `\nParent Feature: #${featureIssue}`;

  if (!storyIssue) {

    const newIssue = await createIssue(
      storyTitle,
      storyBody,
      ["user-story"]
    );

    md = insertStoryIssueNumber(md, storyTitle, newIssue);

    console.log(`Created story issue #${newIssue}`);

  } else {

    await updateIssue(
      storyIssue,
      storyTitle,
      storyBody
    );

    console.log(`Updated story issue #${storyIssue}`);
  }
}
  fs.writeFileSync(filePath, md);
}

async function main() {

  const files = fs.readdirSync(backlogDir)
    .filter(f => f.endsWith(".md"));

  console.log("Found backlog files:", files);

  for (const file of files) {

    const filePath = path.join(backlogDir, file);

    await processFile(filePath);
  }
}

main().catch(err => {

  console.error("Backlog sync failed:", err);

  process.exit(1);
});