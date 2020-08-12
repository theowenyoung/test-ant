const path = require("path");
const fs = require("fs-extra");
const {
  buildSingleWorkflow,
  getWorkflows,
  buildNativeEvent,
  buildNativeSecrets,
} = require("./workflow");
const { run: runTrigger } = require("./trigger");
const log = require("./log");
const run = async (options = {}) => {
  options = {
    workflows: "./workflows",
    dest: "./dist",
    base: process.cwd(),
    logLevel: "warn",
    ...options,
  };
  log.setLevel(options.logLevel);
  let githubObj = {};
  try {
    githubObj = JSON.parse(process.env.JSON_GITHUB);
    if (!githubObj) {
      githubObj = {};
    }
  } catch (error) {
    log.error("parse JSON_GITHUB error:", error);
    throw error;
  }
  const { base } = options;
  const workflowsPath = path.resolve(base, options.workflows);
  const destPath = path.resolve(base, options.dest);
  let secretObj = {};
  try {
    secretObj = JSON.parse(process.env.JSON_SECRETS);
  } catch (error) {
    log.error("parse secret json error: ", error);
  }
  const context = {
    secrets: secretObj,
    github: githubObj,
  };
  // build native event
  await buildNativeEvent({
    dest: destPath,
    github: githubObj,
  });
  // build secret

  await buildNativeSecrets({
    dest: destPath,
    secrets: secretObj,
  });
  // if webhook event
  const isWebhookEvent = githubObj.event_name === "repository_dispatch";
  log.debug("isWebhookEvent: ", isWebhookEvent);
  const workflows = await getWorkflows({
    src: workflowsPath,
    context,
  });
  // create workflow dest dir
  await fs.ensureDir(path.resolve(destPath, "workflows"));

  let needHandledWorkflows = workflows.filter(
    (item) => item.triggers.length > 0
  );

  //
  if (isWebhookEvent) {
    // only handle webhook event
    needHandledWorkflows = needHandledWorkflows.filter((item) => {
      const triggers = item.triggers;
      let isMatchedWebhookEvent = false;
      for (let index = 0; index < triggers.length; index++) {
        const trigger = triggers[index];
        if (trigger.name === "webhook") {
          if (trigger.options && trigger.options.event) {
            // specific evetn
            if (trigger.options.event === githubObj.event.action) {
              isMatchedWebhookEvent = true;
            }
          } else {
            isMatchedWebhookEvent = true;
          }
        }
      }
      return isMatchedWebhookEvent;
    });
  }
  log.debug(
    "needHandledWorkflows",
    JSON.stringify(
      needHandledWorkflows.map((item) => {
        return { relativePath: item.relativePath, triggers: item.triggers };
      }),
      null,
      2
    )
  );

  const workflowTodos = [];
  let triggerIndex = 0;
  for (let i = 0; i < needHandledWorkflows.length; i++) {
    const workflow = needHandledWorkflows[i];
    const triggers = workflow.triggers || [];
    const workflowTodo = {
      dest: destPath,
      workflow: workflow,
      context: context,
      triggers: [],
    };
    // manual run trigger
    for (let j = 0; j < triggers.length; j++) {
      const trigger = triggers[j];
      let triggerResult = {
        results: [],
      };
      try {
        triggerResult = await runTrigger({
          trigger: {
            ...trigger,
            workflowRelativePath: workflow.relativePath,
          },
          context,
        });
        log.debug("triggerResult", triggerResult);
      } catch (error) {
        throw error;
      }

      if (triggerResult.results.length > 0) {
        // check is need to run workflowTodos
        for (let index = 0; index < triggerResult.results.length; index++) {
          const element = triggerResult.results[index];
          workflowTodo.triggers.push({
            id: `${triggerIndex}-${triggerResult.id}-${trigger.name}`,
            name: trigger.name,
            options: trigger.options,
            payload: element,
          });
          triggerIndex++;
        }
      }
    }
    workflowTodos.push(workflowTodo);
  }
  for (let index = 0; index < workflowTodos.length; index++) {
    const element = workflowTodos[index];
    if (element.triggers.length > 0) {
      await buildSingleWorkflow(element);
    }
  }
};

module.exports = run;
