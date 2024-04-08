import { Context } from "contextlink";
import { launchPuterShell } from "./puter-shell/main.js";
import { HtermPTT } from "./pty/HtermPTT.js";
import { CreateEnvProvider } from "./platform/anura/env.js";
import { CreateFilesystemProvider } from "./platform/anura/filesystem.js";

window.main_shell = async () => {
  const config = anura.settings.get("anura-shell-config");

  new HtermPTT(async (ptt) => {
    await launchPuterShell(
      new Context({
        ptt,
        config,
        externs: new Context({
          anura,
        }),
        platform: new Context({
          name: "node",
          env: CreateEnvProvider(),
          filesystem: CreateFilesystemProvider(),
        }),
      }),
    );
  });
};
