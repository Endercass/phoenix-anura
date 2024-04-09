export class HookableCommandProvider {
  constructor(commands) {
    this.commands = commands;
  }

  async lookup(id, { ctx }) {
    return this.commands[id];
  }

  async lookupAll(id, { ctx }) {
    const result = await this.lookup(id, { ctx });
    if (result) {
      return [result];
    }
    return undefined;
  }
}
