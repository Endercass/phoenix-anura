import { Exit } from "./coreutil_lib/exit.js";

export default {
  name: "eval",
  usage: "eval [OPTIONS] [INTERPRETER]",
  description:
    "Evaluate JavaScript code from standard input. Optionally specify an INTERPRETER as either 'current' or 'top'\n" +
    "If 'current' is specified, the code will be evaluated in the current context.\n" +
    "If 'top' is specified, the code will be evaluated in the top-level context.\n" +
    "Pass the option '-j' or '--json' to output the result as JSON.",
  args: {
    $: "simple-parser",
    allowPositionals: true,
    options: {
      json: {
        description: "Output the result as JSON",
        short: "j",
        type: "boolean",
      },
    },
  },
  execute: async (ctx) => {
    const textEncoder = new TextEncoder();

    let line, done;
    const arr = [];
    const next_line = async () => {
      ({ value: line, done } = await ctx.externs.in_.read());
    };

    for (await next_line(); !done; await next_line()) {
      arr.push(line, "\n");
    }

    const code = await new Blob(arr, { type: "text/plain" }).text();

    let interpreter = ctx.locals.positionals[0];

    const toString = (val) =>
      (ctx.locals.values.json ? JSON.stringify(val) : val) + "\n";

    try {
      switch (interpreter) {
        case "top":
          ctx.externs.out.write(toString(await window.top.eval(code)));
          break;
        default:
          ctx.externs.out.write(toString(await window.eval(code)));
      }
    } catch (e) {
      await ctx.externs.err.write(
        "\x1B[31;1meval: error: " + e.toString() + "\x1B[0m\n",
      );
      throw new Exit(1);
    }
  },
};
