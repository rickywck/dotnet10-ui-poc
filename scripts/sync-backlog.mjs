import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

// --------------------------
// CONFIG
// --------------------------
const BACKLOG_DIR = "./backlog";
const EPICS_DIR = path.join(BACKLOG_DIR, "epics");
const STORIES_DIR = path.join(BACKLOG_DIR, "stories");
const FIXTURE_DIR_NAMES = new Set(["fixtures", "_fixtures", "samples", "_samples"]);

const GITHUB_OWNER = "rickywck";
const GITHUB_REPO = "dotnet10-ui-poc";
const GITHUB_TOKEN = process.env.GH_PAT;

if (!GITHUB_TOKEN) {
  console.error("Missing GH_PAT environment variable");
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --------------------------
// HELPERS
// --------------------------
function normalizeTitle(title) {
  return title.trim().toLowerCase();
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function isMetadataComment(line) {
  return /^<!--\s*[a-z0-9-]+:\s*.*\s*-->$/i.test(line.trim());
}

function parseMetadataComment(line) {
  const match = line.trim().match(/^<!--\s*([a-z0-9-]+):\s*(.*?)\s*-->$/i);
  if (!match) return null;
  return { key: match[1].toLowerCase(), value: match[2] };
}

function extractSectionMeta(lines, headingIndex) {
  const meta = {};
  let endIndex = headingIndex;

  for (let i = headingIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      endIndex = i;
      continue;
    }

    const parsed = parseMetadataComment(line);
    if (parsed) {
      meta[parsed.key] = parsed.value;
      endIndex = i;
      continue;
    }

    break;
  }

  return { meta, contentStart: endIndex + 1 };
}

function findNextHeading(lines, startIndex, predicates) {
  for (let i = startIndex; i < lines.length; i++) {
    if (predicates.some((predicate) => predicate(lines[i]))) {
      return i;
    }
  }

  return lines.length;
}

function extractBody(lines, startIndex, endExclusive) {
  return lines.slice(startIndex, endExclusive).join("\n").trim();
}

function getIssueNumberFromMeta(meta) {
  if (!meta["github-issue"]) return null;
  const parsed = Number.parseInt(meta["github-issue"], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoTimestamp(value) {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

function upsertHeadingComments(lines, headingIndex, orderedComments) {
  let blockEnd = headingIndex;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || isMetadataComment(lines[i])) {
      blockEnd = i;
      continue;
    }
    break;
  }

  const keyToLine = new Map();
  for (let i = headingIndex + 1; i <= blockEnd; i++) {
    const parsed = parseMetadataComment(lines[i] || "");
    if (parsed) keyToLine.set(parsed.key, i);
  }

  let insertAt = headingIndex + 1;
  for (const [key, value] of orderedComments) {
    const line = `<!-- ${key}: ${value} -->`;
    if (keyToLine.has(key)) {
      lines[keyToLine.get(key)] = line;
    } else {
      lines.splice(insertAt, 0, line);
      insertAt += 1;
    }
  }
}

function walkMarkdownFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (FIXTURE_DIR_NAMES.has(entry.name.toLowerCase())) continue;
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(fullPath);
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function makeStoryAnchor(featureTitle) {
  return `feature-${featureTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function readFileLines(filePath) {
  return fs.readFileSync(filePath, "utf-8").split("\n");
}

function ensureStartsWithPrefix(value, prefix) {
  const trimmed = value.trim();
  return trimmed.startsWith(prefix) ? trimmed : `${prefix}${trimmed}`;
}

function formatBody(baseBody, metadataLines) {
  const normalizedBody = baseBody?.trim() ? baseBody.trim() : "_No details provided._";
  const normalizedMeta = metadataLines.filter(Boolean).join("\n");
  return normalizedMeta ? `${normalizedBody}\n\n${normalizedMeta}` : normalizedBody;
}

// --------------------------
// PARSERS
// --------------------------
function parseEpicFile(filePath) {
  const lines = readFileLines(filePath);
  const epicHeadingIndex = lines.findIndex((line) => line.startsWith("# Epic:"));

  if (epicHeadingIndex < 0) {
    throw new Error(`Epic file missing '# Epic:' heading: ${toPosix(filePath)}`);
  }

  const epicTitle = lines[epicHeadingIndex].replace("# Epic:", "").trim();
  if (!epicTitle) throw new Error(`Epic title cannot be empty: ${toPosix(filePath)}`);

  const epicMetaData = extractSectionMeta(lines, epicHeadingIndex);
  const firstFeatureIndex = findNextHeading(lines, epicMetaData.contentStart, [
    (line) => line.startsWith("## Feature:"),
    (line) => line.startsWith("# Epic:"),
  ]);

  const epic = {
    type: "epic",
    title: epicTitle,
    body: extractBody(lines, epicMetaData.contentStart, firstFeatureIndex),
    filePath,
    headingIndex: epicHeadingIndex,
    issueNumber: getIssueNumberFromMeta(epicMetaData.meta),
    lastSyncedUpdatedAt: epicMetaData.meta["github-updated-at"] || null,
    meta: epicMetaData.meta,
  };

  const features = [];
  let idx = firstFeatureIndex;
  while (idx < lines.length) {
    if (lines[idx].startsWith("# Epic:")) {
      throw new Error(`Only one epic per file is supported: ${toPosix(filePath)}`);
    }

    if (!lines[idx].startsWith("## Feature:")) {
      idx += 1;
      continue;
    }

    const featureTitle = lines[idx].replace("## Feature:", "").trim();
    if (!featureTitle) throw new Error(`Feature title cannot be empty: ${toPosix(filePath)}`);

    const featureMeta = extractSectionMeta(lines, idx);
    const nextFeatureOrEpic = findNextHeading(lines, featureMeta.contentStart, [
      (line) => line.startsWith("## Feature:"),
      (line) => line.startsWith("# Epic:"),
    ]);

    features.push({
      type: "feature",
      title: featureTitle,
      body: extractBody(lines, featureMeta.contentStart, nextFeatureOrEpic),
      filePath,
      headingIndex: idx,
      issueNumber: getIssueNumberFromMeta(featureMeta.meta),
      lastSyncedUpdatedAt: featureMeta.meta["github-updated-at"] || null,
      parentEpicTitle: epicTitle,
      meta: featureMeta.meta,
    });

    idx = nextFeatureOrEpic;
  }

  return { epic, features };
}

function parseStoryFile(filePath) {
  const lines = readFileLines(filePath);
  const storyHeadingIndex = lines.findIndex((line) => line.startsWith("### User Story:"));

  if (storyHeadingIndex < 0) {
    throw new Error(`Story file missing '### User Story:' heading: ${toPosix(filePath)}`);
  }

  const storyTitle = lines[storyHeadingIndex].replace("### User Story:", "").trim();
  if (!storyTitle) throw new Error(`User story title cannot be empty: ${toPosix(filePath)}`);

  const storyMeta = extractSectionMeta(lines, storyHeadingIndex);
  const parentFeatureTitleRaw = storyMeta.meta["parent-feature-title"];
  const parentFeatureLink = storyMeta.meta["parent-feature-link"];

  if (!parentFeatureTitleRaw) {
    throw new Error(`Story missing parent-feature-title metadata: ${toPosix(filePath)}`);
  }

  if (!parentFeatureLink) {
    throw new Error(`Story missing parent-feature-link metadata: ${toPosix(filePath)}`);
  }

  const parentFeatureTitle = ensureStartsWithPrefix(parentFeatureTitleRaw, "#").slice(1).trim();
  if (!parentFeatureTitle) {
    throw new Error(`Story parent-feature-title is invalid: ${toPosix(filePath)}`);
  }

  return {
    type: "story",
    title: storyTitle,
    body: extractBody(lines, storyMeta.contentStart, lines.length),
    filePath,
    headingIndex: storyHeadingIndex,
    issueNumber: getIssueNumberFromMeta(storyMeta.meta),
    lastSyncedUpdatedAt: storyMeta.meta["github-updated-at"] || null,
    parentFeatureTitle,
    parentFeatureLink,
    meta: storyMeta.meta,
  };
}

function parseBacklog() {
  const epicFiles = walkMarkdownFiles(EPICS_DIR);
  const storyFiles = walkMarkdownFiles(STORIES_DIR);

  const epics = [];
  const features = [];
  const stories = [];

  for (const filePath of epicFiles) {
    const parsed = parseEpicFile(filePath);
    epics.push(parsed.epic);
    features.push(...parsed.features);
  }

  for (const filePath of storyFiles) {
    stories.push(parseStoryFile(filePath));
  }

  return { epics, features, stories, epicFiles, storyFiles };
}

// --------------------------
// GITHUB API
// --------------------------
async function getIssue(number) {
  const { data } = await octokit.issues.get({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    issue_number: number,
  });
  return data;
}

async function createIssue(title, body, labels) {
  const { data } = await octokit.issues.create({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    title,
    body,
    labels,
  });
  return data;
}

async function updateIssue(number, title, body) {
  const { data } = await octokit.issues.update({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    issue_number: number,
    title,
    body,
  });
  return data;
}

async function ensureSubIssueRelationship(parentNodeId, childNodeId, parentNumber, childNumber) {
  const query = `
    mutation($parentId: ID!, $subIssueId: ID!) {
      addSubIssue(input: { issueId: $parentId, subIssueId: $subIssueId }) {
        issue {
          id
        }
      }
    }
  `;

  try {
    await octokit.request("POST /graphql", {
      query,
      variables: {
        parentId: parentNodeId,
        subIssueId: childNodeId,
      },
    });
    console.log(`Linked native sub-issue #${childNumber} under #${parentNumber}`);
  } catch (error) {
    const message = error?.message || "Unknown error";
    const knownAlreadyLinked = /already|exists|duplicate/i.test(message);
    if (knownAlreadyLinked) {
      console.log(`Sub-issue relation already present (#${parentNumber} -> #${childNumber})`);
      return;
    }

    console.warn(
      `Could not link native sub-issue (#${parentNumber} -> #${childNumber}). Continuing with body metadata. Error: ${message}`
    );
  }
}

async function syncIssue(item, issueTitle, issueBody, labels) {
  if (!item.issueNumber) {
    const created = await createIssue(issueTitle, issueBody, labels);
    console.log(`Created ${item.type} issue #${created.number}`);
    return {
      issueNumber: created.number,
      nodeId: created.node_id,
      updatedAt: created.updated_at,
      skippedConflict: false,
    };
  }

  const existing = await getIssue(item.issueNumber);
  const hasDiff = existing.title !== issueTitle || (existing.body || "") !== (issueBody || "");

  if (!hasDiff) {
    console.log(`No change for issue #${item.issueNumber}`);
    return {
      issueNumber: existing.number,
      nodeId: existing.node_id,
      updatedAt: existing.updated_at,
      skippedConflict: false,
    };
  }

  const remoteTs = parseIsoTimestamp(existing.updated_at);
  const localTs = parseIsoTimestamp(item.lastSyncedUpdatedAt);
  if (localTs && remoteTs && remoteTs > localTs) {
    console.warn(
      `Conflict detected for issue #${item.issueNumber} (${item.type}: ${item.title}). ` +
        "Remote was updated after last sync; skipping overwrite."
    );

    return {
      issueNumber: existing.number,
      nodeId: existing.node_id,
      updatedAt: existing.updated_at,
      skippedConflict: true,
    };
  }

  const updated = await updateIssue(item.issueNumber, issueTitle, issueBody);
  console.log(`Updated issue #${item.issueNumber}`);
  return {
    issueNumber: updated.number,
    nodeId: updated.node_id,
    updatedAt: updated.updated_at,
    skippedConflict: false,
  };
}

// --------------------------
// VALIDATION
// --------------------------
function validateGraph(epics, features, stories) {
  if (!epics.length) throw new Error("No epic files found under backlog/epics");
  if (!features.length) throw new Error("No features found under backlog/epics files");

  const featureByTitle = new Map();
  for (const feature of features) {
    const key = normalizeTitle(feature.title);
    if (featureByTitle.has(key)) {
      throw new Error(
        `Duplicate feature title '${feature.title}' across files. Use unique feature titles for parent resolution.`
      );
    }
    featureByTitle.set(key, feature);
  }

  const seenIssueNumbers = new Map();
  for (const item of [...epics, ...features, ...stories]) {
    if (!item.issueNumber) continue;
    if (seenIssueNumbers.has(item.issueNumber)) {
      const first = seenIssueNumbers.get(item.issueNumber);
      throw new Error(
        `Duplicate github-issue ${item.issueNumber} in ${toPosix(first.filePath)} and ${toPosix(item.filePath)}`
      );
    }
    seenIssueNumbers.set(item.issueNumber, item);
  }

  for (const story of stories) {
    const feature = featureByTitle.get(normalizeTitle(story.parentFeatureTitle));
    if (!feature) {
      throw new Error(
        `Story '${story.title}' references missing parent feature '${story.parentFeatureTitle}' (${toPosix(story.filePath)})`
      );
    }
  }

  return { featureByTitle };
}

// --------------------------
// WRITE-BACK
// --------------------------
function writeMetadataComments(items) {
  const updatesByFile = new Map();

  for (const item of items) {
    if (!updatesByFile.has(item.filePath)) updatesByFile.set(item.filePath, []);

    const comments = [
      ["github-issue", String(item.issueNumber)],
      ["github-updated-at", item.lastSyncedUpdatedAt],
    ];

    if (item.type === "story") {
      comments.push(["parent-feature-title", `#${item.parentFeatureTitle}`]);
      comments.push(["parent-feature-link", item.parentFeatureLink]);
    }

    updatesByFile.get(item.filePath).push({
      headingIndex: item.headingIndex,
      comments,
    });
  }

  for (const [filePath, updates] of updatesByFile.entries()) {
    const lines = readFileLines(filePath);
    const before = lines.join("\n");

    updates
      .sort((a, b) => b.headingIndex - a.headingIndex)
      .forEach((update) => upsertHeadingComments(lines, update.headingIndex, update.comments));

    const after = lines.join("\n");
    if (after !== before) {
      fs.writeFileSync(filePath, after, "utf-8");
      console.log(`Updated metadata in ${toPosix(filePath)}`);
    }
  }
}

// --------------------------
// MAIN
// --------------------------
async function main() {
  try {
    const { epics, features, stories, epicFiles, storyFiles } = parseBacklog();
    console.log(`Found ${epicFiles.length} epic file(s), ${storyFiles.length} story file(s)`);

    const { featureByTitle } = validateGraph(epics, features, stories);
    const conflicts = [];

    // Sync epics first
    for (const epic of epics) {
      const result = await syncIssue(
        epic,
        `Epic: ${epic.title}`,
        formatBody(epic.body, []),
        ["epic"]
      );

      epic.issueNumber = result.issueNumber;
      epic.lastSyncedUpdatedAt = result.updatedAt;
      epic.nodeId = result.nodeId;
      if (result.skippedConflict) conflicts.push(epic);
    }

    const epicByTitle = new Map(epics.map((epic) => [normalizeTitle(epic.title), epic]));

    // Sync features and link to epic
    for (const feature of features) {
      const parentEpic = epicByTitle.get(normalizeTitle(feature.parentEpicTitle));
      if (!parentEpic?.issueNumber) {
        throw new Error(`Missing parent epic issue for feature '${feature.title}'`);
      }

      const featureBody = formatBody(feature.body, [
        `Parent Epic: #${parentEpic.issueNumber}`,
        `Parent Epic Title: #${parentEpic.title}`,
      ]);

      const result = await syncIssue(
        feature,
        `Feature: ${feature.title}`,
        featureBody,
        ["feature"]
      );

      feature.issueNumber = result.issueNumber;
      feature.lastSyncedUpdatedAt = result.updatedAt;
      feature.nodeId = result.nodeId;
      if (result.skippedConflict) conflicts.push(feature);

      if (parentEpic.nodeId && feature.nodeId) {
        await ensureSubIssueRelationship(
          parentEpic.nodeId,
          feature.nodeId,
          parentEpic.issueNumber,
          feature.issueNumber
        );
      }
    }

    // Sync stories and link to feature
    for (const story of stories) {
      const parentFeature = featureByTitle.get(normalizeTitle(story.parentFeatureTitle));
      if (!parentFeature?.issueNumber) {
        throw new Error(`Missing parent feature issue for story '${story.title}'`);
      }

      const storyBody = formatBody(story.body, [
        `Parent Feature: #${parentFeature.issueNumber}`,
        `Parent Feature Title: #${parentFeature.title}`,
        `Parent Feature Backlog Link: ${story.parentFeatureLink}`,
      ]);

      const result = await syncIssue(
        story,
        `User Story: ${story.title}`,
        storyBody,
        ["user-story"]
      );

      story.issueNumber = result.issueNumber;
      story.lastSyncedUpdatedAt = result.updatedAt;
      story.nodeId = result.nodeId;
      if (result.skippedConflict) conflicts.push(story);

      if (parentFeature.nodeId && story.nodeId) {
        await ensureSubIssueRelationship(
          parentFeature.nodeId,
          story.nodeId,
          parentFeature.issueNumber,
          story.issueNumber
        );
      }
    }

    writeMetadataComments([...epics, ...features, ...stories]);

    if (conflicts.length) {
      console.warn("Sync completed with conflicts (skipped overwrites):");
      for (const item of conflicts) {
        console.warn(`- ${item.type}: ${item.title} (issue #${item.issueNumber})`);
      }
    } else {
      console.log("Sync completed without conflicts.");
    }
  } catch (err) {
    console.error("Backlog sync failed:", err);
    process.exit(1);
  }
}

main();
