import { BetterReader } from "dev-pty";

const encoder = new TextEncoder();

export class HtermPTT {
  constructor(hterm, node, decorate, onReady) {
    this.node = node;
    this.hterm = new hterm.Terminal();

    this.hterm.decorate(this.node);

    this.hterm.onTerminalReady = async () => {
      node
        .querySelector("iframe")
        .contentDocument.querySelector("x-screen").style.overflow = "hidden";
      let io = this.hterm.io.push();
      if (decorate) {
        await decorate(this);
      } else {
        this.hterm.setBackgroundColor("#141516");
        this.hterm.setCursorColor("#bbb");
      }

      this.ioctl_listeners = {};

      this.readableStream = new ReadableStream({
        start: (controller) => {
          this.readController = controller;
        },
      });
      this.writableStream = new WritableStream({
        start: (controller) => {
          this.writeController = controller;
        },
        write: (chunk) => {
          if (typeof chunk === "string") {
            chunk = encoder.encode(chunk);
          }
          io.writeUTF8(this.LF_to_CRLF(chunk));
        },
      });
      this.out = this.writableStream.getWriter();
      this.in = this.readableStream.getReader();
      this.in = new BetterReader({ delegate: this.in });

      io.onVTKeystroke = (key) => {
        this.readController.enqueue(encoder.encode(key));
      };

      io.sendString = (str) => {
        this.readController.enqueue(encoder.encode(str));
      };

      io.onTerminalResize = (cols, rows) => {
        this.emit("ioctl.set", {
          data: {
            windowSize: {
              rows,
              cols,
            },
          },
        });
      };

      this.hterm.installKeyboard();

      onReady(this);
    };
  }

  on(name, listener) {
    if (!this.ioctl_listeners.hasOwnProperty(name)) {
      this.ioctl_listeners[name] = [];
    }
    this.ioctl_listeners[name].push(listener);
  }

  emit(name, evt) {
    if (!this.ioctl_listeners.hasOwnProperty(name)) return;
    for (const listener of this.ioctl_listeners[name]) {
      listener(evt);
    }
  }

  LF_to_CRLF(input) {
    let lfCount = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === 0x0a) {
        lfCount++;
      }
    }

    const output = new Uint8Array(input.length + lfCount);

    let outputIndex = 0;
    for (let i = 0; i < input.length; i++) {
      // If LF is encountered, insert CR (0x0D) before LF (0x0A)
      if (input[i] === 0x0a) {
        output[outputIndex++] = 0x0d;
      }
      output[outputIndex++] = input[i];
    }

    return output;
  }
}
