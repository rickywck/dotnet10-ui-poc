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

function getIssueNumber(md) {
  const match = md.match(/<!--\s*github-issue:\s*(\d+)\s*-->/);
  return match ? parseInt(match[1]) : null;
}

function insertIssueNumber(md, issueNumber) {
  if (md.includes("<!-- github-issue:")) return md;

  return md.replace(
    /(#[^\n]*\n)/,
    `$1\n<!-- github-issue: ${issueNumber} -->\n`
  );
}

function parseFeature(md) {
  const lines = md.split("\n");

  let title = "";
  let body = "";

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace("# ", "").trim();
    } else {
      body += line + "\n";
    }
  }

  return { title, body };
}

async function createIssue(title, body) {
  const res = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels: ["feature"]
  });

  console.log(`Created issue #${res.data.number}`);

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

  console.log(`Updated issue #${issueNumber}`);
}

async function main() {

  const files = fs.readdirSync(backlogDir).filter(f => f.endsWith(".md"));

  console.log("Found backlog files:", files);

  for (const file of files) {

    const filePath = path.join(backlogDir, file);
    let md = fs.readFileSync(filePath, "utf8");

    const { title, body } = parseFeature(md);

    const issueNumber = getIssueNumber(md);

    if (issueNumber) {

      await updateIssue(issueNumber, title, body);

    } else {

      const newIssueNumber = await createIssue(title, body);

      md = insertIssueNumber(md, newIssueNumber);

      fs.writeFileSync(filePath, md);

      console.log(`Stored issue mapping in ${file}`);
    }
  }
}

main().catch(err => {
  console.error("Backlog sync failed:", err);
  process.exit(1);
});