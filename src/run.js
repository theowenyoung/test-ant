const path = require("path");
const fs = require("fs-extra");
const {
  buildWorkflow,
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
        if (trigger.trigger_name === "webhook") {
          console.log("trigger.options", trigger.options);

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
      console.log("isMatchedWebhookEvent", isMatchedWebhookEvent);

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
  let workflowIndex = 0;
  for (let i = 0; i < needHandledWorkflows.length; i++) {
    const workflow = needHandledWorkflows[i];
    const triggers = workflow.triggers || [];
    // manual run trigger
    for (let j = 0; j < triggers.length; j++) {
      const trigger = triggers[j];
      let triggerResult = {
        results: [],
      };
      try {
        triggerResult = await runTrigger({ trigger, context });
        log.debug("triggerResult", triggerResult);
      } catch (error) {
        throw error;
      }

      if (triggerResult.results.length > 0) {
        // check is need to run workflowTodos
        for (let index = 0; index < triggerResult.results.length; index++) {
          const element = triggerResult.results[index];

          workflowTodos.push({
            dest: destPath,
            workflow: workflow,
            id: `${workflowIndex}-${triggerResult.id}-${trigger.trigger_name}`,
            trigger_name: trigger.trigger_name,
            options: trigger.options,
            payload: element,
            context: context,
          });
          workflowIndex++;
        }
      }
    }
  }
  for (let i = 0; i < workflowTodos.length; i++) {
    await buildWorkflow(workflowTodos[i]);
  }
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
};

module.exports = run;
