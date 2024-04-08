import { BetterReader } from "dev-pty";

const encoder = new TextEncoder();
const $ = document.querySelector.bind(document);

export class HtermPTT {
  constructor(onReady) {
    this.node = $("#terminal");
    this.hterm = new hterm.Terminal();

    this.hterm.decorate(this.node);

    this.hterm.onTerminalReady = async () => {
      let e = document
        .querySelector("iframe")
        .contentDocument.querySelector("x-screen");
      console.log(e);
      e.style.overflow = "hidden";
      e.style.position = "relative";

      let io = this.hterm.io.push();
      this.hterm.setBackgroundColor("#141516");
      this.hterm.setCursorColor("#bbb");

      if (anura.settings.get("transparent-ashell")) {
        frameElement.style.backgroundColor = "rgba(0, 0, 0, 0)";
        frameElement.parentNode.parentNode.style.backgroundColor =
          "rgba(0, 0, 0, 0)";
        frameElement.parentNode.parentNode.style.backdropFilter = "blur(5px)";
        document
          .querySelector("iframe")
          .contentDocument.documentElement.style.setProperty(
            "--hterm-background-color",
            "20,21,22,0.85",
          );
        Array.from(frameElement.parentNode.parentNode.children).filter((e) =>
          e.classList.contains("title"),
        )[0].style.backgroundColor = "rgba(20, 21, 22, 0.85)";
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
        console.log(key);
        this.readController.enqueue(encoder.encode(key));
      };

      io.sendString = (str) => {
        console.log(str);
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
