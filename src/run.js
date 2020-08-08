const path = require("path");
const { buildWorkflow, getWorkflows } = require("./workflow");
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

  const workflows = await getWorkflows({
    src: workflowsPath,
  });
  log.debug("workflows", workflows);

  const needHandledWorkflows = workflows.filter(
    (item) => item.events.length > 0
  );
  log.debug("needHandledWorkflows", needHandledWorkflows);

  const actions = [];
  for (let i = 0; i < needHandledWorkflows.length; i++) {
    const workflow = needHandledWorkflows[i];
    const events = workflow.events || [];
    // manual run trigger
    for (let j = 0; j < events.length; j++) {
      const event = events[i];

      const triggerResult = await runTrigger(event);
      log.debug("triggerResult", triggerResult);
      if (triggerResult.results.length > 0) {
        // check is need to run actions
        for (let index = 0; index < triggerResult.results.length; index++) {
          const element = triggerResult.results[index];
          actions.push({
            dest: destPath,
            workflow: workflow,
            eventContext: {
              id: `${event.event}-${triggerResult.id}-${index}`,
              event: event.event,
              payload: element,
            },
          });
        }
      }
    }
  }
  for (let i = 0; i < actions.length; i++) {
    await buildWorkflow(actions[i]);
  }
};

module.exports = run;
