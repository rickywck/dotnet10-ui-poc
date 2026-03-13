#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";

// ===== CONFIG =====
const owner = "rickywck"; // replace
const repo = "dotnet10-ui-poc";               // replace
const projectNumber = 1;                     // the number in GitHub URL, e.g., https://github.com/orgs/ORG/projects/1
// ==================

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // PAT with repo + project access
});

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `token ${process.env.GITHUB_TOKEN}` },
});

// Fetch the GraphQL project ID dynamically
async function getProjectId() {
  const project = await octokit.projects.get({
    project_id: projectNumber
  });
  console.log("Detected Project node_id:", project.data.node_id);
  return project.data.node_id;
}

// ===== Markdown parsing =====
function parseMarkdown(fileContent) {
  const lines = fileContent.split("\n");
  const features = [];
  let currentFeature = null;
  let currentStory = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("# Feature:")) {
      currentFeature = { title: line.replace("# Feature:", "").trim(), description: "", stories: [] };
      features.push(currentFeature);
    } else if (line.startsWith("### ")) {
      currentStory = { title: line.replace("### ", "").trim(), body: "" };
      if (currentFeature) currentFeature.stories.push(currentStory);
    } else if (line.length > 0) {
      if (currentStory) currentStory.body += line + "\n";
      else if (currentFeature) currentFeature.description += line + "\n";
    }
  }
  return features;
}

// ===== Create issues =====
async function createIssue(title, body, labels = []) {
  const issue = await octokit.issues.create({ owner, repo, title, body, labels });
  console.log(`Created issue #${issue.data.number}: ${title}`);
  return issue.data;
}

// ===== Add issue to project =====
async function addToProject(issueNodeId, projectNodeId) {
  await graphqlWithAuth(`
    mutation ($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }
  `, { projectId: projectNodeId, contentId: issueNodeId });
}

// ===== Main =====
async function main() {
  const projectNodeId = await getProjectId(); // auto-fetch

  const backlogDir = path.join(process.cwd(), "backlog");
  const files = fs.readdirSync(backlogDir).filter(f => f.endsWith(".md"));
  console.log("Found backlog files:", files);

  for (const file of files) {
    const content = fs.readFileSync(path.join(backlogDir, file), "utf-8");
    const features = parseMarkdown(content);
    console.log("Parsed features:", features.map(f => f.title));

    for (const feature of features) {
      const featureIssue = await createIssue(feature.title, feature.description, ["feature"]);
      await addToProject(featureIssue.node_id, projectNodeId);

      for (const story of feature.stories) {
        const storyIssue = await createIssue(story.title, story.body, ["user-story"]);

        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: storyIssue.number,
          body: `Parent Feature: #${featureIssue.number}`,
        });

        await addToProject(storyIssue.node_id, projectNodeId);
        console.log(`Linked user story #${storyIssue.number} to feature #${featureIssue.number}`);
      }
    }
  }
}

main().catch(err => {
  console.error("Backlog sync failed:", err);
  process.exit(1);
});