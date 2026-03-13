#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

const owner = "YOUR_GITHUB_USERNAME_OR_ORG";  // replace
const repo = "YOUR_REPO_NAME";                 // replace
const projectNumber = 1; // replace with your GitHub Project number

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // should be PAT with repo + project access
});

function parseMarkdown(fileContent) {
  const lines = fileContent.split("\n");
  const features = [];
  let currentFeature = null;
  let currentStory = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("# Feature:")) {
      currentFeature = {
        title: line.replace("# Feature:", "").trim(),
        description: "",
        stories: [],
      };
      features.push(currentFeature);
    } else if (line.startsWith("## Description") || line.startsWith("## User Stories")) {
      // skip headers
    } else if (line.startsWith("### ")) {
      // User story
      currentStory = { title: line.replace("### ", "").trim(), body: "" };
      if (currentFeature) currentFeature.stories.push(currentStory);
    } else if (line.length > 0) {
      if (currentStory) {
        currentStory.body += line + "\n";
      } else if (currentFeature) {
        currentFeature.description += line + "\n";
      }
    }
  }
  return features;
}

async function createIssue(title, body, labels = []) {
  const issue = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });
  console.log(`Created issue #${issue.data.number}: ${title}`);
  return issue.data;
}

async function addToProject(issueNumber) {
  try {
    await octokit.projects.createCard({
      column_id: projectNumber, // project number is used here
      content_id: issueNumber,
      content_type: "Issue",
    });
  } catch (err) {
    console.warn("Could not add issue to project:", err.message);
  }
}

async function main() {
  const backlogDir = path.join(process.cwd(), "backlog");
  const files = fs.readdirSync(backlogDir).filter(f => f.endsWith(".md"));

  console.log("Found backlog files:", files);

  for (const file of files) {
    const content = fs.readFileSync(path.join(backlogDir, file), "utf-8");
    const features = parseMarkdown(content);

    console.log("Parsed features:", features.map(f => f.title));

    for (const feature of features) {
      const featureIssue = await createIssue(feature.title, feature.description, ["feature"]);

      // Add user stories
      for (const story of feature.stories) {
        const storyIssue = await createIssue(story.title, story.body, ["user-story"]);

        // Add comment to link parent feature
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: storyIssue.number,
          body: `Parent Feature: #${featureIssue.number}`,
        });

        console.log(`Linked user story #${storyIssue.number} to feature #${featureIssue.number}`);
      }
    }
  }
}

main().catch(err => {
  console.error("Backlog sync failed:", err);
  process.exit(1);
});