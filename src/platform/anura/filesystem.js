import { ErrorCodes, PosixError } from "../PosixError.js";

function convertAnuraError(e) {
  if (ErrorCodes[e.code] === undefined) {
    console.error(`Unknown error code: ${e.code}`);
    console.error(e);
    return e;
  }
  return new PosixError(ErrorCodes[e.code], e.message);
}

function wrapAPIs(apis) {
  for (const method in apis) {
    if (typeof apis[method] !== "function") {
      continue;
    }
    const original = apis[method];
    apis[method] = async (...args) => {
      try {
        return await original(...args);
      } catch (e) {
        throw convertAnuraError(e);
      }
    };
  }
  return apis;
}

const shell = new anura.fs.Shell();

export const CreateFilesystemProvider = (anura) =>
  wrapAPIs({
    capabilities: {},
    readdir: async (path) =>
      (await anura.fs.promises.readdir(path, { withFileTypes: true })).map(
        (dirent) => ({
          modified: dirent.mtimeMs / 1000,
          accessed: dirent.atimeMs / 1000,
          created: dirent.ctimeMs / 1000,
          is_dir: dirent.isDirectory(),
          is_symlink: dirent.isSymbolicLink(),
          is_shortcut: 0,
          subdomains: [],
          ...dirent,
        }),
      ),

    stat: async (path) =>
      (await anura.fs.promises.stat(path)).map((stat) => ({
        modified: stat.mtimeMs / 1000,
        accessed: stat.atimeMs / 1000,
        created: stat.ctimeMs / 1000,
        is_dir: stat.isDirectory(),
        is_symlink: stat.isSymbolicLink(),
        is_shortcut: 0,
        subdomains: [],
        ...stat,
      })),
    mkdir: anura.fs.promises.mkdir,
    read: anura.fs.promises.readFile,
    write: async (path, data) => {
      if (data instanceof Blob) {
        return await anura.fs.promises.writeFile(
          path,
          Filer.Buffer(await data.arrayBuffer()),
        );
      }

      return await anura.fs.promises.writeFile(path, data);
    },
    rm: async (path, { recursive = false }) => {
      const stat = await anura.fs.promises.stat(path);

      if (stat.is_dir && !recursive) {
        throw PosixError.IsDirectory({ path });
      }

      return await shell.promises.rm(path, { recursive });
    },
    rmdir: async (path) => {
      const stat = await anura.fs.promises.stat(path);

      if (!stat.is_dir) {
        throw PosixError.IsNotDirectory({ path });
      }

      return await shell.promises.rm(path, { recursive: true });
    },
    move: anura.fs.promises.rename,
    copy: async (oldPath, newPath) => {
      const srcStat = await anura.fs.promises.stat(oldPath);
      const srcIsDir = srcStat.isDirectory();

      if (srcIsDir) {
        // Copying directories is not yet implemented in the Anura shell.
        throw PosixError.IsDirectory({ path: oldPath });
      }

      return await shell.promises.cp(oldPath, newPath);
    },
  });
