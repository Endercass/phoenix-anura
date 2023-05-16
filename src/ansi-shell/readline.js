import { Context } from "../context/context";
import { Uint8List } from "../util/bytes";
import { Log } from "../util/log";
import { StatefulProcessorBuilder } from "../util/statemachine";
import { ANSIContext } from "./ANSIContext";
import { CSI_HANDLERS } from "./rl_csi_handlers";

const decoder = new TextDecoder();

const CHAR_LF = '\n'.charCodeAt(0);
const CHAR_CR = '\r'.charCodeAt(0);

const cc = chr => chr.charCodeAt(0);

const ReadlineProcessorBuilder = builder => builder
    // TODO: import these constants from a package
    .installContext(ANSIContext)
    .installContext(new Context({
        variables: {
            result: { value: '' },
            cursor: { value: 0 },
        },
        imports: {
            out: {},
            in_: {}
        }
    }))
    .variable('result', { getDefaultValue: () => '' })
    .variable('cursor', { getDefaultValue: () => 0 })
    .external('out', { required: true })
    .external('in_', { required: true })
    .beforeAll('get-byte', async ctx => {
        const { locals, externs } = ctx;

        const byteBuffer = new Uint8Array(1);
        await externs.in_.read(byteBuffer);
        locals.byteBuffer = byteBuffer;
        locals.byte = byteBuffer[0];
    })
    .state('start', async ctx => {
        const { consts, vars, externs, locals } = ctx;

        if ( locals.byte === consts.CHAR_LF ) {
            externs.out.write('\n');
            ctx.setState('end');
            return;
        }

        if ( locals.byte === consts.CHAR_ESC ) {
            ctx.setState('ESC');
            return;
        }

        // (note): DEL is actually the backspace key
        // [explained here](https://en.wikipedia.org/wiki/Backspace#Common_use)
        // TOOD: very similar to delete in CSI_HANDLERS; how can this be unified?
        if ( locals.byte === consts.CHAR_DEL ) {
            // can't backspace at beginning of line
            if ( vars.cursor === 0 ) return;

            vars.result = vars.result.slice(0, vars.cursor - 1) +
                vars.result.slice(vars.cursor)

            vars.cursor--;

            // TODO: maybe wrap these CSI codes in a library
            const backspaceSequence = new Uint8Array([
                // consts.CHAR_ESC, consts.CHAR_CSI, cc('s'), // save cur
                consts.CHAR_ESC, consts.CHAR_CSI, cc('D'), // left
                consts.CHAR_ESC, consts.CHAR_CSI, cc('P'),
                // consts.CHAR_ESC, consts.CHAR_CSI, cc('u'), // restore cur
                // consts.CHAR_ESC, consts.CHAR_CSI, cc('D'), // left
            ]);

            externs.out.write(backspaceSequence);
            return;
        }

        const part = decoder.decode(locals.byteBuffer);

        if ( vars.cursor === vars.result.length ) {
            // output
            externs.out.write(locals.byteBuffer);
            // update buffer
            vars.result = vars.result + part;
            // update cursor
            vars.cursor += part.length;
        } else {
            // output
            const insertSequence = new Uint8Array([
                consts.CHAR_ESC,
                consts.CHAR_CSI,
                '@'.charCodeAt(0),
                ...locals.byteBuffer
            ]);
            externs.out.write(insertSequence);
            // update buffer
            vars.result =
                vars.result.slice(0, vars.cursor) +
                part +
                vars.result.slice(vars.cursor)
            // update cursor
            vars.cursor += part.length;
        }
    })
    .onTransitionTo('ESC-CSI', async ctx => {
        ctx.vars.controlSequence = new Uint8List();
    })
    .state('ESC', async ctx => {
        const { consts, vars, externs, locals } = ctx;

        if ( locals.byte === consts.CHAR_ESC ) {
            externs.out.write(consts.CHAR_ESC);
            ctx.setState('start');
            return;
        }

        if ( locals.byte === ctx.consts.CHAR_CSI ) {
            ctx.setState('ESC-CSI');
            return;
        }
        if ( locals.byte === ctx.consts.CHAR_OSC ) {
            ctx.setState('ESC-OSC');
            return;
        }
    })
    .state('ESC-CSI', async ctx => {
        const { consts, locals, vars } = ctx;

        if (
            locals.byte >= consts.CSI_F_0 &&
            locals.byte <  consts.CSI_F_E
        ) {
            ctx.trigger('ESC-CSI.post');
            ctx.setState('start');
            return;
        }

        vars.controlSequence.append(locals.byte);
    })
    .state('ESC-OSC', async ctx => {
        const { consts, locals, vars } = ctx;

        // TODO: ESC\ can also end an OSC sequence according
        //       to sources, but this has not been implemented
        //       because it would add another state.
        //       This should be implemented when there's a
        //       simpler solution ("peek" & "scan" functionality)
        if (
            locals.byte === 0x07
        ) {
            // ctx.trigger('ESC-OSC.post');
            ctx.setState('start');
            return;
        }

        vars.controlSequence.append(locals.byte);
    })
    .action('ESC-CSI.post', async ctx => {
        const { vars, externs, locals } = ctx;

        const finalByte = locals.byte;
        const controlSequence = vars.controlSequence.toArray();

        // Log.log('controlSequence', controlSequence);

        if ( ! CSI_HANDLERS.hasOwnProperty(finalByte) ) {
            return;
        }

        ctx.locals.controlSequence = controlSequence;
        ctx.locals.doWrite = false;
        CSI_HANDLERS[finalByte](ctx);

        if ( ctx.locals.doWrite ) {
            externs.out.write(new Uint8Array([
                ctx.consts.CHAR_ESC,
                ctx.consts.CHAR_CSI,
                ...controlSequence,
                finalByte
            ]))
        }
    })
    .build();

const ReadlineProcessor = ReadlineProcessorBuilder(
    new StatefulProcessorBuilder()
);

class Readline {
    constructor (params) {
        this.internal_ = {};
        for ( const k in params ) this.internal_[k] = params[k];
    }

    async readline (prompt) {
        const out = this.internal_.out;
        const in_ = this.internal_.in;

        await out.write(prompt);

        const {
            result
        } = await ReadlineProcessor.run({ out, in_ });

        return result;
    }

    // async readline (prompt) {
    //     const out = this.internal_.out;
    //     const in_ = this.internal_.in;

    //     out.write(prompt);

    //     let text = '';

    //     const decoder = new TextDecoder();

    //     while ( true ) {
    //         const byteBuffer = new Uint8Array(1);
    //         await in_.read(byteBuffer);

    //         const byte = byteBuffer[0];
    //         if ( byte === CHAR_LF ) {
    //             out.write('\n');
    //             break;
    //         }

    //         out.write(byteBuffer);
    //         const part = decoder.decode(byteBuffer);
    //         text += part;
    //     }

    //     // const text = await in_.readLine({ stream: out });
    //     return text;
    // }
}

export default class ReadlineLib {
    static create(params) {
        const rl = new Readline(params);
        return rl.readline.bind(rl);
    }
}