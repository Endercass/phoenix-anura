/*
 * Copyright (C) 2024  Puter Technologies Inc.
 *
 * This file is part of Phoenix Shell.
 *
 * Phoenix Shell is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import builtins from "./coreutils/__exports__.js";
import { XDocumentPTT } from "../pty/XDocumentPTT.js";
import ReadlineLib from "../ansi-shell/readline/readline.js";

// TODO: auto-gen argument parser registry from files
import SimpleArgParser from "../ansi-shell/arg-parsers/simple-parser.js";
import ErrorsDecorator from "../ansi-shell/decorators/errors.js";
import { ANSIShell } from "../ansi-shell/ANSIShell.js";
import { Context } from "contextlink";
import { SHELL_VERSIONS } from "../meta/versions.js";
import { PuterShellParser } from "../ansi-shell/parsing/PuterShellParser.js";
import { BuiltinCommandProvider } from "./providers/BuiltinCommandProvider.js";
import { Pipe } from "../ansi-shell/pipeline/Pipe.js";
import { Coupler } from "../ansi-shell/pipeline/Coupler.js";
import { BetterReader } from "dev-pty";
import { MultiWriter } from "../ansi-shell/ioutil/MultiWriter.js";
import { CompositeCommandProvider } from "./providers/CompositeCommandProvider.js";
import { ScriptCommandProvider } from "./providers/ScriptCommandProvider.js";

const argparser_registry = {
  [SimpleArgParser.name]: SimpleArgParser,
};

const decorator_registry = {
  [ErrorsDecorator.name]: ErrorsDecorator,
};

const GH_LINK = {
  terminal: "https://github.com/HeyPuter/terminal",
  phoenix: "https://github.com/HeyPuter/phoenix",
};

export const launchPuterShell = async (ctx) => {
  const config = ctx.config;
  const ptt = ctx.ptt;
  const puterShell = ctx.puterShell;

  // Need to replace `in` with something we can write to
  const real_pipe = new Pipe();
  const echo_pipe = new Pipe();
  const out_writer = new MultiWriter({
    delegates: [echo_pipe.in, real_pipe.in],
  });
  new Coupler(ptt.in, out_writer);
  const echo = new Coupler(echo_pipe.out, ptt.out);
  const stdin = new BetterReader({ delegate: real_pipe.out });
  echo.off();

  const readline = ReadlineLib.create({
    in: stdin,
    out: ptt.out,
  });

  const sdkv2 = globalThis.puter;
  if (ctx.platform.name !== "node") {
    await sdkv2.setAuthToken(config["puter.auth.token"]);
    const source_without_trailing_slash =
      (config.source && config.source.replace(/\/$/, "")) ||
      "https://api.puter.com";
    await sdkv2.setAPIOrigin(source_without_trailing_slash);
  }

  // const commandProvider = new BuiltinCommandProvider();
  const commandProvider = new CompositeCommandProvider([
    new BuiltinCommandProvider(),
    new ScriptCommandProvider(),
  ]);

  ctx = ctx.sub({
    externs: new Context({
      config,
      puterShell,
      readline: readline.readline.bind(readline),
      in: stdin,
      out: ptt.out,
      echo,
      parser: new PuterShellParser(),
      commandProvider,
      sdkv2,
      historyManager: readline.history,
    }),
    registries: new Context({
      argparsers: argparser_registry,
      decorators: decorator_registry,
      // While we use the BuiltinCommandProvider to provide the
      // functionality of command lookup, we still need a registry
      // of builtins to support the `help` command.
      builtins,
    }),
    plugins: new Context(),
    locals: new Context(),
  });

  const ansiShell = new ANSIShell(ctx);

  // TODO: move ioctl to PTY
  ptt.on("ioctl.set", (evt) => {
    ansiShell.dispatchEvent(
      new CustomEvent("signal.window-resize", {
        detail: {
          ...evt.data.windowSize,
        },
      }),
    );
  });

  const fire = (text) => {
    // Define fire-like colors (ANSI 256-color codes)
    const fireColors = [202, 208, 166];

    // Split the text into an array of characters
    const chars = text.split("");

    // Apply a fire-like color to each character
    const fireText = chars
      .map((char) => {
        // Select a random fire color for each character
        const colorCode =
          fireColors[Math.floor(Math.random() * fireColors.length)];
        // Return the character wrapped in the ANSI escape code for the selected color
        return `\x1b[38;5;${colorCode}m${char}\x1b[0m`;
      })
      .join("");

    return fireText;
  };

  ctx.externs.out.write(
    `${fire("AnuraOS Phoenix Shell")} [v${SHELL_VERSIONS[0].v}]\n` + "\n",
  );

  for (;;) {
    await ansiShell.doPromptIteration();
  }
};
