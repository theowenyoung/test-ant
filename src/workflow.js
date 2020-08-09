const path = require("path");
const fg = require("fast-glob");
const yaml = require("js-yaml");
const mapObj = require("map-obj");
const fs = require("fs-extra");
const log = require("./log");
const supportEventTypes = ["rss"];
const { template } = require("./util");
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
  console.log("workflowData", JSON.stringify(workflowData, null, 2));
  // handle context expresstion
  const newWorkflowData = mapObj(
    workflowData,
    (key, value) => {
      if (typeof value === "string") {
        // if supported

        value = template(
          value,
          {
            on: {
              [event]: {
                outputs: payload,
              },
            },
          },
          {
            includeVariableRegex: /^on\./,
            shouldReplaceUndefinedToEmpty: true,
          }
        );
      }
      return [key, value];
    },
    {
      deep: true,
    }
  );
  console.log("newWorkflowData", JSON.stringify(newWorkflowData, null, 2));

  const workflowContent = yaml.safeDump(newWorkflowData);
  await fs.outputFile(destWorkflowPath, workflowContent);
  return {
    workflow:newWorkflowData
  };
};
const buildNativeEvent = (options={})=>{
  const baseDest = options.dest;
  const destWorkflowEventPath = path.resolve(baseDest,eventJson);
  await fs.outputFile(destWorkflowEventPath, workflowContent);
  return [];
}
module.exports = {
  getWorkflows,
  buildWorkflow,
  buildNativeEvent
};
