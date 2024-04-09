import { Context } from "contextlink";
import { launchPuterShell } from "./puter-shell/main.js";
import { HtermPTT } from "./pty/HtermPTT.js";
import { CreateEnvProvider } from "./platform/anura/env.js";
import { CreateFilesystemProvider } from "./platform/anura/filesystem.js";

const providers = [];
const commands = {};

const create_shell = async (
  config,
  element,
  hterm,
  anura,
  process,
  decorate,
) => {
  await new Promise((resolve) => {
    new HtermPTT(hterm, element, decorate, async (ptt) => {
      await launchPuterShell(
        new Context({
          ptt,
          config,
          providers,
          commands,
          externs: new Context({
            anura,
            process,
          }),
          platform: new Context({
            name: "node",
            env: CreateEnvProvider(anura),
            filesystem: CreateFilesystemProvider(anura),
          }),
        }),
      );
      resolve();
    });
  });
};

const register_provider = (provider) => {
  providers.push(provider);
};

const unregister_provider = (provider) => {
  const idx = providers.indexOf(provider);
  if (idx >= 0) {
    providers.splice(idx, 1);
  }
};

const register_command = (id, command) => {
  commands[id] = command;
};

const unregister_command = (idOrCommand) => {
  if (typeof idOrCommand === "string") {
    delete commands[idOrCommand];
    return;
  }
  for (const id in commands) {
    if (commands[id] === idOrCommand) {
      delete commands[id];
    }
  }
};

export {
  create_shell,
  register_provider,
  unregister_provider,
  register_command,
  unregister_command,
};
