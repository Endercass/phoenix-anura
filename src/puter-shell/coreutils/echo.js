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
import { processEscapes } from "./coreutil_lib/echo_escapes.js";

export default {
    name: 'echo',
    args: {
        $: 'simple-parser',
        allowPositionals: true,
        options: {
            n: {
                type: 'boolean'
            },
            e: {
                type: 'boolean'
            },
            E: {
                type: 'boolean'
            }
        }
    },
    execute: async ctx => {
        const { positionals, values } = ctx.locals;

        let output = '';
        let notFirst = false;
        for ( const positional of positionals ) {
            if ( notFirst ) {
                output += ' ';
            } else notFirst = true;
            output += positional;
        }

        if ( ! values.n ) {
            output += '\n';
        }

        if ( values.e && ! values.E ) {
            console.log('processing');
            output = processEscapes(output);
        }

        const lines = output.split('\n');
        for ( let i=0 ; i < lines.length ; i++ ) {
            const line = lines[i];
            const isLast = i === lines.length - 1;
            await ctx.externs.out.write(line + (isLast ? '' : '\n'));
        }
    }
}
