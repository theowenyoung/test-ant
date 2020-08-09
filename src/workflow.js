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
          event_name: key,
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
      log.error("load yaml file error:", filePath, e);
    }
  }

  return workflows;
};

const buildWorkflow = async (options = {}) => {
  log.debug("buildWorkflow options:", options);
  const {
    eventContext: { event_name, payload, id },
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
    `${id}-${relativePathWithoutExt}.yaml`
  );
  log.debug("destWorkflowPath", destWorkflowPath);

  const workflowData = workflow.data;

  workflowData.on = { push: null };
  console.log("workflowData", JSON.stringify(workflowData, null, 2));
  const context = {
    on: {
      [event_name]: {
        outputs: payload,
        options: options.eventContext.options,
      },
    },
  };
  // handle context expresstion
  const newWorkflowData = mapObj(
    workflowData,
    (key, value) => {
      if (typeof value === "string") {
        // if supported

        value = template(value, context, {
          shouldReplaceUndefinedToEmpty: true,
        });
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
    workflow: newWorkflowData,
  };
};
const buildNativeEvent = async (options = {}) => {
  const baseDest = options.dest;
  const githubJson = options.githubJson;
  const destWorkflowEventPath = path.resolve(baseDest, "event.json");
  let eventJson = "{}";
  let github = {};
  try {
    github = JSON.parse(githubJson);
    if (!github) {
      github = {};
    }
  } catch (error) {
    log.error("parse JSON_GITHUB error:", error);
    throw error;
  }
  eventJson = JSON.stringify(github.event, null, 2);
  await fs.outputFile(destWorkflowEventPath, eventJson);
  return {
    path: destWorkflowEventPath,
    eventJson: eventJson,
  };
};
const buildNativeSecrets = async (options = {}) => {
  const baseDest = options.dest;
  const secretsJson = options.secretsJson;
  let secretsObj = {};
  try {
    secretsObj = JSON.parse(secretsJson);
  } catch (error) {
    log.error("parse SECRETS_JSON json error:", error);
    throw error;
  }

  const destWorkflowSecretsPath = path.resolve(baseDest, ".secrets");
  let secrets = "";
  Object.keys(secretsObj).forEach((key) => {
    secrets += key + "=" + secretsObj[key] + "\n";
  });
  await fs.outputFile(destWorkflowSecretsPath, secrets);
  return {
    path: destWorkflowSecretsPath,
    secrets: secrets,
  };
};
module.exports = {
  getWorkflows,
  buildWorkflow,
  buildNativeEvent,
  buildNativeSecrets,
};
