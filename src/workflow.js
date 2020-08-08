const path = require("path");
const fg = require("fast-glob");
const yaml = require("js-yaml");
const fs = require("fs-extra");
const log = require("./log");
const supportEventTypes = ["rss"];

const getSupportedEvents = (doc) => {
  const events = [];
  if (doc && doc.on) {
    const keys = Object.keys(doc.on);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (supportEventTypes.includes(key)) {
        // valid event
        events.push({
          event: key,
          options: doc.on[key],
        });
      }
    }
  }
  return events;
};
const getWorkflows = async (options = {}) => {
  if (!options.src) {
    throw new Error("Can not found src options");
  }
  const { src: workflowsPath } = options;
  console.log("workflowsPath", workflowsPath);

  // get all files with json object
  const entries = await fg(["**/*.yml", "**/*.yaml"], {
    cwd: workflowsPath,
    dot: true,
  });
  log.debug("yaml file paths:", entries);
  const workflows = [];
  // Get document, or throw exception on error
  for (let index = 0; index < entries.length; index++) {
    const filePath = path.resolve(workflowsPath, entries[index]);
    try {
      const doc = yaml.safeLoad(await fs.readFile(filePath, "utf8"));
      if (doc) {
        let events = getSupportedEvents(doc);
        workflows.push({
          path: filePath,
          relativePath: entries[index],
          data: doc,
          events: events,
        });
      } else {
        log.debug("skip empty file", filePath);
      }
    } catch (e) {
      log.error("load yaml file error:", e);
    }
  }

  return workflows;
};

const buildWorkflow = async (options = {}) => {
  log.debug("buildWorkflow options:", options);
  const {
    eventContext: { event, payload, id },
    workflow,
    dest,
  } = options;
  const relativePathWithoutExt = workflow.relativePath
    .split(".")
    .slice(0, -1)
    .join(".");
  const destWorkflowPath = path.resolve(
    dest,
    "workflows",
    `${relativePathWithoutExt}-${id}.yaml`
  );
  log.debug("destWorkflowPath", destWorkflowPath);

  const workflowData = workflow.data;

  workflowData.on = { push: null };
  const workflowContent = yaml.safeDump(workflowData);
  await fs.writeFile(destWorkflowPath, workflowContent);
  return [];
};

module.exports = {
  getWorkflows,
  buildWorkflow,
};
