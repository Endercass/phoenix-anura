export class MergeCompleter {
  constructor(completers) {
    this.completers = completers;
  }

  async getCompletions(ctx, inputState) {
    const completions = await Promise.all(
      this.completers.map((completer) =>
        completer.getCompletions(ctx, inputState),
      ),
    );

    return completions.flat();
  }
}
