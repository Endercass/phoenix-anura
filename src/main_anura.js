import { Context } from "contextlink";
import { launchPuterShell } from "./puter-shell/main.js";
import { HtermPTT } from "./pty/HtermPTT.js";
import { CreateEnvProvider } from "./platform/anura/env.js";
import { CreateFilesystemProvider } from "./platform/anura/filesystem.js";

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

export { create_shell };
