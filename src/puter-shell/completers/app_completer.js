export class AppCompleter {
  async getCompletions(ctx, inputState) {
    if (inputState.input === "") {
      return [];
    }

    return Object.keys(anura.apps)
      .filter((app) => app.startsWith(inputState.input))
      .map((app) => app.slice(inputState.input.length));
  }
}
