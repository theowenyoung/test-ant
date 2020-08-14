const path = require("path");
const fg = require("fast-glob");
const yaml = require("js-yaml");
const mapObj = require("map-obj");
const fs = require("fs-extra");
const log = require("./log");
const { template } = require("./util");
const Triggers = require("./triggers");
const getSupportedTriggers = (doc, context) => {
  const supportTriggerTypes = Object.keys(Triggers);
  const triggers = [];
  if (doc && doc.on) {
    const keys = Object.keys(doc.on);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (supportTriggerTypes.includes(key)) {
        // handle context expresstion
        let newOptions = doc.on[key];
        if (doc.on[key]) {
          newOptions = mapObj(
            doc.on[key],
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
        }

        // valid event
        triggers.push({
          name: key,
          options: newOptions || {},
        });
      }
    }
  }
  return triggers;
};
const getWorkflows = async (options = {}) => {
  if (!options.src) {
    throw new Error("Can not found src options");
  }
  const { src: workflowsPath, context } = options;
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
        let triggers = getSupportedTriggers(doc, context);
        workflows.push({
          path: filePath,
          relativePath: entries[index],
          data: doc,
          triggers: triggers,
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

const getJobsDependences = (jobs) => {
  const jobKeys = Object.keys(jobs);
  const jobsWhoHasNeeds = [];
  const jobsNoNeeds = [];
  jobKeys.forEach((jobKey) => {
    const job = jobs[jobKey];
    if (job && job.needs && job.needs.length > 0) {
      jobsWhoHasNeeds.push({
        id: jobKey,
        needs: job.needs,
      });
    }
    if (!job.needs || job.needs.length === 0) {
      jobsNoNeeds.push(jobKey);
    }
  });

  let lastJobs = [];
  let beNeededJobs = [];
  jobsWhoHasNeeds.forEach((job) => {
    job.needs.forEach((beNeededJob) => {
      const isBeNeeded = jobsWhoHasNeeds.find(
        (item) => item.id === beNeededJob
      );
      if (isBeNeeded) {
        beNeededJobs.push(beNeededJob);
      }
    });
  });
  beNeededJobs = [...new Set(beNeededJobs)];
  jobsWhoHasNeeds.forEach((job) => {
    if (!beNeededJobs.includes(job.id)) {
      lastJobs.push(job.id);
    }
  });
  if (lastJobs.length === 0) {
    lastJobs = jobKeys;
  }
  return { lastJobs, firstJobs: jobsNoNeeds };
};

const renameJobsBySuffix = (jobs, suffix) => {
  const jobKeys = Object.keys(jobs);
  const newJobs = {};
  jobKeys.forEach((jobKey) => {
    const job = jobs[jobKey];
    const newJobKey = `${jobKey}${suffix}`;
    if (job.needs) {
      job.needs = job.needs.map((item) => {
        return `${item}${suffix}`;
      });
    }
    newJobs[newJobKey] = job;
  });
  return newJobs;
};
const buildSingleWorkflow = async (options = {}) => {
  log.debug("buildWorkflow options:", options);
  const { context: workflowContext, workflow, dest, triggers } = options;
  const relativePathWithoutExt = workflow.relativePath
    .split(".")
    .slice(0, -1)
    .join(".");
  const destWorkflowPath = path.resolve(
    dest,
    "workflows",
    `${relativePathWithoutExt}.yaml`
  );
  const workflowData = workflow.data;
  // handle context expresstion
  const workflowDataJobs = workflowData.jobs;
  delete workflowData.jobs;
  const newWorkflowData = workflowData;
  const jobsGroups = [];
  for (let index = 0; index < triggers.length; index++) {
    const trigger = triggers[index];
    const { payload, name, id, options: triggerOptions } = trigger;
    const context = {
      ...workflowContext,
      on: {
        [name]: {
          outputs: payload,
          options: triggerOptions,
        },
      },
    };
    // handle context expresstion
    const newJobs = mapObj(
      workflowDataJobs,
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

    const jobs = renameJobsBySuffix(newJobs, `_${index}`);

    // jobs id rename for merge

    const jobsDependences = getJobsDependences(jobs);
    jobsGroups.push({
      lastJobs: jobsDependences.lastJobs,
      firstJobs: jobsDependences.firstJobs,
      jobs: jobs,
    });
  }

  const finalJobs = {};

  jobsGroups.forEach((jobsGroup, index) => {
    const jobs = jobsGroup.jobs;
    const jobKeys = Object.keys(jobs);

    if (index > 0) {
      jobKeys.forEach((jobKey) => {
        const job = jobs[jobKey];
        if (jobsGroup.firstJobs.includes(jobKey)) {
          if (Array.isArray(job.needs)) {
            job.needs = job.needs.concat(jobsGroups[index - 1].lastJobs);
          } else {
            job.needs = jobsGroups[index - 1].lastJobs;
          }
          finalJobs[jobKey] = job;
        } else {
          finalJobs[jobKey] = job;
        }
      });
    } else {
      jobKeys.forEach((jobKey) => {
        const job = jobs[jobKey];
        finalJobs[jobKey] = job;
      });
    }
  });
  // finalJobs name unique for act unique name
  const finalJobKeys = Object.keys(finalJobs);
  finalJobKeys.forEach((jobKey, index) => {
    const job = finalJobs[jobKey];
    job.name = `${job.name} ${index}`;
    finalJobs[jobKey] = job;
  });
  newWorkflowData.on = {
    push: null,
  };
  newWorkflowData.jobs = finalJobs;

  const workflowContent = yaml.safeDump(newWorkflowData);
  await fs.outputFile(destWorkflowPath, workflowContent);
  return {
    workflow: newWorkflowData,
  };
};

const buildWorkflow = async (options = {}) => {
  log.debug("buildWorkflow options:", options);
  const {
    context: workflowContext,
    workflow,
    dest,
    name,
    payload,
    id,
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
  const workflowData = workflow.data;

  workflowData.on = { push: null };
  const context = {
    ...workflowContext,
    on: {
      [name]: {
        outputs: payload,
        options: options.options,
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
  const workflowContent = yaml.safeDump(newWorkflowData);
  await fs.outputFile(destWorkflowPath, workflowContent);
  return {
    workflow: newWorkflowData,
  };
};
const buildNativeEvent = async (options = {}) => {
  const baseDest = options.dest;
  const github = options.github;
  const destWorkflowEventPath = path.resolve(baseDest, "event.json");
  let eventJson = "{}";
  eventJson = JSON.stringify(github.event, null, 2);
  await fs.outputFile(destWorkflowEventPath, eventJson);
  log.debug("build event file success", destWorkflowEventPath);

  return {
    path: destWorkflowEventPath,
    eventJson: eventJson,
  };
};
const buildNativeSecrets = async (options = {}) => {
  const baseDest = options.dest;
  const secretsObj = options.secrets;

  const destWorkflowSecretsPath = path.resolve(baseDest, ".secrets");
  let secrets = "";
  Object.keys(secretsObj).forEach((key) => {
    secrets += key + "=" + secretsObj[key] + "\n";
  });
  await fs.outputFile(destWorkflowSecretsPath, secrets);
  log.debug("build secrets file success", destWorkflowSecretsPath);
  return {
    path: destWorkflowSecretsPath,
    secrets: secrets,
  };
};
module.exports = {
  getWorkflows,
  buildWorkflow,
  buildSingleWorkflow,
  buildNativeEvent,
  buildNativeSecrets,
};
