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
import { SHELL_VERSIONS } from "../../meta/versions.js";

const logo = `
\x1B[37m    ▄█████████████████    \x1B[31m███████\x1B[0m
\x1B[37m   ▄██████████████████    \x1B[31m███████\x1B[0m
\x1B[37m ▄████████████████████    \x1B[31m███████\x1B[0m
\x1B[37m ████████▀     ▀██████    \x1B[0m
\x1B[37m▄██████▀        ██████    \x1B[33m███████\x1B[0m
\x1B[37m██████▀         ██████    \x1B[33m███████\x1B[0m
\x1B[37m██████          ██████    \x1B[33m███████\x1B[0m
\x1B[37m██████          ██████    \x1B[0m
\x1B[37m██████          ██████    \x1B[32m███████\x1B[0m
\x1B[37m██████          ██████    \x1B[32m███████\x1B[0m
\x1B[37m██████▄        ▄██████    \x1B[32m███████\x1B[0m
\x1B[37m███████▄      ▄███████    \x1B[0m
\x1B[37m █████████████████████    \x1B[34m███████\x1B[0m
\x1B[37m  ████████████████████    \x1B[34m███████\x1B[0m
\x1B[37m   ▀█████████▀ ▀██████    \x1B[34m███████\x1B[0m
`.slice(1);

function pad(str, l, r) {
  "use strict";
  var tmp = new Array(l).join(" ");
  str = "" + str;
  var strClean = str.replace(/\u001b\[[^m]+m/g, "");

  return r
    ? tmp.slice(0, l - strClean.length) +
        str.slice(0, l + str.length - strClean.length)
    : str.slice(0, l + str.length - strClean.length) +
        tmp.slice(0, l - strClean.length);
}

export default {
  name: "neofetch",
  usage: "neofetch",
  description: "Print information about the system.",
  execute: async (ctx) => {
    const cols = [17, 18, 19, 26, 27].reverse();
    const C25 = (n) => `\x1B[38;5;${n}m`;
    const B25 = (n) => `\x1B[48;5;${n}m`;
    const COL = C25(27);
    const END = "\x1B[0m";
    const lines = logo.split("\n").map((line) => pad(line, 40, false));

    lines[0] += COL + ctx.env.USER + END + "@" + COL + ctx.env.HOSTNAME + END;
    lines[1] += "-----------------";
    lines[2] += COL + "OS" + END + ": AnuraOS";
    lines[3] += COL + "Shell" + END + ": Phoenix Shell v" + SHELL_VERSIONS[0].v;
    lines[4] +=
      COL +
      "Commands" +
      END +
      `: ${Object.keys(ctx.registries.builtins).length}`;

    for (let i = 0; i < 16; i++) {
      let ri = i < 8 ? 13 : 14;
      let esc = i < 9 ? `\x1B[3${i}m\x1B[4${i}m` : C25(i) + B25(i);
      lines[ri] += esc + "   ";
    }
    lines[13] += "\x1B[0m";
    lines[14] += "\x1B[0m";

    for (const line of lines) {
      await ctx.externs.out.write(line + "\n");
    }
  },
};
