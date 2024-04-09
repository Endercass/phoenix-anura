export class AppCompleter {
  async getCompletions(ctx, inputState) {
    const { anura } = ctx.externs;

    if (inputState.input === "") {
      return [];
    }

    return Object.keys(anura.apps)
      .filter((app) => app.startsWith(inputState.input))
      .map((app) => app.slice(inputState.input.length));
  }
}
