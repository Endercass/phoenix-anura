export const CreateEnvProvider = (anura) => {
  return {
    getEnv: () => {
      const directories = Object.fromEntries(
        Object.entries(anura.settings.get("directories")).map(([k, v]) => [
          "DIRECTORIES_" + k.toUpperCase(),
          v,
        ]),
      );

      return {
        USER: "anura",
        HOME: "/",
        HOSTNAME: location.hostname,
        PS1: "[\\u@\\h \\w]\\$ ",
        ...directories,
        ...(anura.settings.get("env") || {}),
      };
    },

    get(k) {
      return this.getEnv()[k];
    },
  };
};
