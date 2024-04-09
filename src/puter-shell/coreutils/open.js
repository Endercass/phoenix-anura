import { Exit } from "./coreutil_lib/exit";

export default {
  name: "open",
  usage: "open APP [ARGS]...",
  description: "Launch an anura application.",
  args: {
    $: "simple-parser",
    allowPositionals: true,
  },
  execute: async (ctx) => {
    const { positionals } = ctx.locals;
    const { out, err, anura } = ctx.externs;

    if (positionals.length < 1) {
      await err.write("open: missing app package\n");
      throw new Exit(1);
    }

    const appID = positionals.shift();

    const app = anura.apps[appID];

    if (!app) {
      await err.write(`open: app '${appID}' not found\n`);
      throw new Exit(1);
    }

    await app.open(positionals);
  },
};
