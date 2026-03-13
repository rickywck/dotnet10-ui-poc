import { Octokit } from "@octokit/rest"
import fs from "fs"

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
})

const owner = "ORG"
const repo = "REPO"

async function createFeature(feature) {

  const issue = await octokit.issues.create({
    owner,
    repo,
    title: feature.title,
    body: feature.description
  })

  return issue.data.number
}

async function createUserStory(parentIssue, story) {

  const issue = await octokit.issues.create({
    owner,
    repo,
    title: story.title,
    body: story.body,
    labels: ["user-story"]
  })

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issue.data.number,
    body: `Parent Feature: #${parentIssue}`
  })
}