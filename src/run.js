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
  };
  const workflows = await getWorkflows({
    src: workflowsPath,
    context,
  });
  // create workflow dest dir
  await fs.ensureDir(path.resolve(destPath, "workflows"));

  const needHandledWorkflows = workflows.filter(
    (item) => item.events.length > 0
  );
  log.debug(
    "needHandledWorkflows",
    JSON.stringify(
      needHandledWorkflows.map((item) => {
        return { relativePath: item.relativePath, events: item.events };
      }),
      null,
      2
    )
  );

  const workflowTodos = [];
  let workflowIndex = 0;
  for (let i = 0; i < needHandledWorkflows.length; i++) {
    const workflow = needHandledWorkflows[i];
    const events = workflow.events || [];
    // manual run trigger
    for (let j = 0; j < events.length; j++) {
      const event = events[j];
      let triggerResult = {
        results: [],
      };
      try {
        triggerResult = await runTrigger(event);
        log.debug("triggerResult", triggerResult);
      } catch (error) {
        throw error;
      }

      if (triggerResult.results.length > 0) {
        // check is need to run workflowTodos
        for (let index = 0; index < triggerResult.results.length; index++) {
          const element = triggerResult.results[index];

          workflowTodos.push({
            context: context,
            dest: destPath,
            workflow: workflow,
            eventContext: {
              id: `${workflowIndex}-${triggerResult.id}-${event.event_name}`,
              event_name: event.event_name,
              options: event.options,
              payload: element,
            },
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
    githubJson: process.env.JSON_GITHUB,
  });
  // build secret

  await buildNativeSecrets({
    dest: destPath,
    secretsJson: process.env.JSON_SECRETS,
  });
};

module.exports = run;
