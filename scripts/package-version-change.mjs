import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import catalogue from "../app/studio/package-dashboard-catalogue.json" with { type: "json" };
import { compareVersions, packageRegistryMetadata, packageTargets, publishedPackageReleases } from "./package-dashboard-source.mjs";

const files = ["package.json", "package-lock.json"];
const prefix = "@andrewcharlesmoss/";
const reviewLifetime = 10 * 60_000;
const limit = 256 * 1024;

export class PackageChangeError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function run(file, args, { cwd, env, input, acceptDiff = false, timeout = 10_000 }) {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { cwd, env, timeout, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      if (error && !(acceptDiff && error.code === 1)) reject(error);
      else resolve(stdout);
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

async function temporary(work) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "studio-package-review-"));
  try { return await work(directory); }
  finally { await fs.rm(directory, { recursive: true, force: true }).catch(() => {}); }
}

async function readFiles(root) {
  return Promise.all(files.map(async file => {
    const name = path.join(root, file);
    const stat = await fs.lstat(name);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 4 * 1024 * 1024) {
      throw new PackageChangeError(409, "The dependency files are not regular checkout files.");
    }
    return fs.readFile(name, "utf8");
  }));
}

async function checkout(studio, workspace, projectId) {
  const target = packageTargets[projectId];
  const root = projectId === "acm-studio" ? await fs.realpath(studio) : path.join(await fs.realpath(workspace), projectId);
  const cwd = await fs.realpath(root);
  const dependencyDirectory = path.join(cwd, target.directory);
  if (cwd !== root || await fs.realpath(dependencyDirectory) !== dependencyDirectory) {
    throw new PackageChangeError(409, "The project’s dependency directory must be inside its local checkout, without symbolic links.");
  }
  const top = (await run("git", ["rev-parse", "--show-toplevel"], { cwd })).trim();
  if (cwd !== top) throw new PackageChangeError(409, "The selected project must have its own local Git checkout.");
  const [head, gitDir, branch] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], { cwd }),
    run("git", ["rev-parse", "--absolute-git-dir"], { cwd }),
    run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd }),
  ]);
  const gitDirectory = gitDir.trim();
  if (projectId !== "acm-studio" && (gitDirectory !== path.join(cwd, ".git") || await fs.realpath(gitDirectory) !== gitDirectory)) {
    throw new PackageChangeError(409, "Use the project’s own local checkout to review dependency changes.");
  }
  const gitPaths = files.map(file => path.posix.join(target.directory, file));
  const contents = await readFiles(dependencyDirectory);
  const tracked = await Promise.all(gitPaths.map(file => run("git", ["show", `${head.trim()}:${file}`], { cwd })));
  const changes = await run("git", ["--no-optional-locks", "status", "--porcelain=v1", "--", ...gitPaths], { cwd });
  if (changes || !isDeepStrictEqual(contents, tracked)) {
    throw new PackageChangeError(409, "The project’s dependency files have local changes. Commit or resolve them before preparing another version change.");
  }
  return { cwd, dependencyDirectory, gitPaths, head: head.trim(), branch: branch.trim(), gitDir: gitDirectory, contents };
}

async function loadReleases(id, token) {
  if (!token) throw new PackageChangeError(503, "Version changes need read access to GitHub Packages. Configure Studio’s package registry access and reopen this dialog.");
  const metadata = await packageRegistryMetadata(id, token).catch(() => null);
  if (!metadata) throw new PackageChangeError(503, "Studio couldn’t read published versions from GitHub Packages. Check registry access and try again.");
  return publishedPackageReleases(id, metadata);
}

async function resolveLock({ directory, name, version, token, contents, section }) {
  const userConfig = path.join(directory, "registry.npmrc");
  await fs.writeFile(userConfig, "@andrewcharlesmoss:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${STUDIO_PACKAGES_READ_TOKEN}\n");
  await Promise.all(files.map((file, index) => fs.writeFile(path.join(directory, file), contents[index])));
  const env = {
    PATH: process.env.PATH, STUDIO_PACKAGES_READ_TOKEN: token,
    NPM_CONFIG_USERCONFIG: userConfig, NPM_CONFIG_GLOBALCONFIG: "/dev/null",
    NPM_CONFIG_CACHE: path.join(directory, "cache"), NPM_CONFIG_LOGS_MAX: "0",
  };
  const options = { cwd: directory, env, timeout: 45_000 };
  const policy = await run("npm", ["config", "get", "allow-git", "allow-file", "allow-directory", "allow-remote"], options);
  if (!["git", "file", "directory", "remote"].every(type => new RegExp(`^allow-${type}=all$`, "m").test(policy))) {
    throw new PackageChangeError(503, "Update npm to a version that supports dependency source restrictions, then try again.");
  }
  await run("npm", ["install", "--package-lock-only", "--save-exact", "--ignore-scripts", "--no-audit", "--no-fund",
    section === "devDependencies" ? "--save-dev" : "--save-prod",
    "--allow-git=none", "--allow-file=none", "--allow-directory=none", "--allow-remote=none",
    "--registry=https://registry.npmjs.org", "--fetch-retries=0", `${name}@${version}`], options);
  return readFiles(directory);
}

function checkResolution(contents, candidate, name, version, distribution, section) {
  const manifest = JSON.parse(contents[0]);
  manifest[section][name] = version;
  const expectedLockRoot = JSON.parse(contents[1]).packages[""];
  expectedLockRoot[section][name] = version;
  const lock = JSON.parse(candidate[1]);
  const entry = lock.packages?.[`node_modules/${name}`];
  if (!isDeepStrictEqual(JSON.parse(candidate[0]), manifest) || !isDeepStrictEqual(lock.packages?.[""], expectedLockRoot)
    || lock.lockfileVersion !== 3 || entry?.version !== version || entry.resolved !== distribution.tarball
    || !entry.integrity || (distribution.integrity && distribution.integrity !== entry.integrity)) {
    throw new PackageChangeError(422, "The resolved files don’t match the selected package and version.");
  }
  const originalEntries = JSON.parse(contents[1]).packages;
  for (const [location, item] of Object.entries(lock.packages)) {
    if (location === "" || isDeepStrictEqual(item, originalEntries[location])) continue;
    const url = URL.canParse(item?.resolved) ? new URL(item.resolved) : null;
    if (!url || url.protocol !== "https:" || !["registry.npmjs.org", "npm.pkg.github.com"].includes(url.host)
      || url.username || url.password || url.search || url.hash || item.link || !item.integrity) {
      throw new PackageChangeError(422, "A changed dependency uses an unsupported package source.");
    }
  }
  for (const pkg of catalogue.packages) {
    const location = `node_modules/${prefix}${pkg.id}`;
    if (`node_modules/${name}` !== location && !isDeepStrictEqual(lock.packages[location], originalEntries[location])) {
      throw new PackageChangeError(422, "The selected version would also change another shared package. Review that update in Git instead.");
    }
  }
}

async function createPatch(directory, original, candidate, gitPaths, packageDirectory) {
  await Promise.all(["before", "after"].map(async (side, sideIndex) => {
    const dir = path.join(directory, side);
    await fs.mkdir(path.join(dir, packageDirectory), { recursive: true });
    await Promise.all(gitPaths.map((file, index) => fs.writeFile(path.join(dir, file), [original, candidate][sideIndex][index])));
  }));
  return run("git", ["diff", "--no-index", "--no-ext-diff", "--no-color", "--no-renames", "--", "before", "after"], { cwd: directory, acceptDiff: true });
}

async function applyPatch({ cwd, head, patch, gitPaths }) {
  // A disposable index makes Git check the complete pre-image of each
  // file without staging anything in the checkout's real index.
  await temporary(async directory => {
    const env = { ...process.env, GIT_INDEX_FILE: path.join(directory, "index") };
    const options = { cwd, env };
    const trackedFiles = await run("git", ["ls-tree", head, "--", ...gitPaths], options);
    await run("git", ["update-index", "--index-info"], { ...options, input: trackedFiles });
    await run("git", ["update-index", "--refresh"], options);
    await run("git", ["-c", "apply.ignoreWhitespace=no", "apply", "--index", "--whitespace=nowarn", "-p2"], { ...options, input: patch });
  });
}

async function restorePartialApply({ dependencyDirectory, contents }, candidate) {
  if (await fs.realpath(dependencyDirectory).catch(() => null) !== dependencyDirectory) return false;
  let restored = true;
  for (const [index, file] of files.entries()) {
    const destination = path.join(dependencyDirectory, file);
    let directory;
    try {
      const stat = await fs.lstat(destination);
      if (!stat.isFile() || stat.nlink !== 1 || stat.size > 4 * 1024 * 1024) throw new Error("Unexpected checkout file");
      const observed = await fs.readFile(destination, "utf8");
      if (observed === contents[index]) continue;
      if (observed !== candidate[index]) throw new Error("Independent edit");
      directory = await fs.mkdtemp(path.join(dependencyDirectory, ".studio-package-recovery-"));
      const replacement = path.join(directory, file);
      await fs.writeFile(replacement, contents[index], { mode: stat.mode & 0o777 });
      const latest = await fs.lstat(destination);
      if (latest.dev !== stat.dev || latest.ino !== stat.ino || latest.ctimeMs !== stat.ctimeMs
        || await fs.readFile(destination, "utf8") !== observed) throw new Error("Checkout changed during recovery");
      await fs.rename(replacement, destination);
    } catch {
      restored = false;
    } finally {
      if (directory) await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
    }
  }
  return restored && isDeepStrictEqual(await readFiles(dependencyDirectory).catch(() => null), contents);
}

export function createPackageVersionChanges({ releases = loadReleases, resolve = resolveLock, apply = applyPatch, now = Date.now } = {}) {
  const reviews = new Map();
  let preparing = false;
  return async function change(root, token, request, workspace = path.dirname(root)) {
    for (const [id, review] of reviews) if (review.expires <= now()) reviews.delete(id);
    if (request.action === "apply") {
      const review = reviews.get(request.reviewId);
      if (!review) throw new PackageChangeError(409, "This review has expired or was already used. Prepare a new review.");
      if (review.projectId !== request.projectId) throw new PackageChangeError(409, "This review belongs to a different project.");
      reviews.delete(request.reviewId);
      const verified = await checkout(root, workspace, review.projectId);
      if (!isDeepStrictEqual(verified, review.base)) throw new PackageChangeError(409, "The checkout changed after review. Prepare a new review.");
      const lockPath = path.join(review.base.gitDir, "studio-package-version.lock");
      const recoveryFile = path.join(lockPath, "review.json");
      try { await fs.mkdir(lockPath, { mode: 0o700 }); }
      catch (error) {
        if (error.code === "EEXIST") throw new PackageChangeError(409, "Another package change is in progress. Prepare a new review when it finishes.");
        throw error;
      }
      let keepRecovery = false;
      try {
        const current = await checkout(root, workspace, review.projectId);
        if (!isDeepStrictEqual(current, review.base)) throw new PackageChangeError(409, "The checkout changed after review. Prepare a new review.");
        await fs.writeFile(recoveryFile, JSON.stringify({ head: current.head, patch: review.patch }), { mode: 0o600, flag: "wx" });
        keepRecovery = true;
        try {
          await apply({ cwd: current.cwd, head: current.head, patch: review.patch, gitPaths: current.gitPaths });
          if (!isDeepStrictEqual(await readFiles(current.dependencyDirectory), review.candidate)) throw new Error("Readback mismatch");
          keepRecovery = false;
        } catch {
          keepRecovery = !(await restorePartialApply(current, review.candidate));
          throw new PackageChangeError(409, keepRecovery
            ? "Studio couldn’t restore both dependency files safely. Check the files against the saved recovery review before trying again."
            : "Studio couldn’t apply the change. Both dependency files match their original contents. Prepare a new review to retry.");
        }
        return { applied: true, projectId: review.projectId, version: review.version };
      } finally {
        if (!keepRecovery) {
          await fs.unlink(recoveryFile).catch(() => {});
          await fs.rmdir(lockPath).catch(() => {});
        }
      }
    }

    if (!catalogue.packages.some(pkg => pkg.id === request.packageId)) throw new PackageChangeError(400, "Choose an available shared package.");
    if (request.action === "versions") {
      const versions = (await releases(request.packageId, token)).map(([version]) => version).sort((a, b) => compareVersions(b, a));
      return { versions };
    }

    const { projectId } = request;
    if (!Object.hasOwn(packageTargets, projectId)) throw new PackageChangeError(400, "Choose a supported project.");
    const target = packageTargets[projectId];
    if (preparing) throw new PackageChangeError(409, "Studio is preparing another review. Try again when it finishes.");
    preparing = true;
    try {
      const base = await checkout(root, workspace, projectId);
      const name = prefix + request.packageId;
      const manifest = JSON.parse(base.contents[0]);
      const previous = manifest[target.section]?.[name];
      if (manifest.name !== target.manifestName || compareVersions(previous, previous) !== 0 || previous === request.version) {
        throw new PackageChangeError(422, "Choose a different published version of a package this project already pins.");
      }
      const release = (await releases(request.packageId, token)).find(([version]) => version === request.version)?.[1];
      if (!release) throw new PackageChangeError(422, "That version is no longer available. Choose a published version.");
      return await temporary(async directory => {
        let candidate;
        try { candidate = await resolve({ directory, name, version: request.version, token, contents: base.contents, section: target.section }); }
        catch (error) {
          if (error instanceof PackageChangeError) throw error;
          throw new PackageChangeError(422, "npm couldn’t resolve this version for the selected project. Check registry access or choose another version.");
        }
        checkResolution(base.contents, candidate, name, request.version, release.dist, target.section);
        const patch = await createPatch(directory, base.contents, candidate, base.gitPaths, target.directory);
        if (!patch || Buffer.byteLength(patch) > limit) throw new PackageChangeError(422, "This change is too large to review in Studio. Review the dependency update in Git.");
        if (reviews.size >= 8) reviews.delete(reviews.keys().next().value);
        const reviewId = randomUUID();
        reviews.set(reviewId, { projectId, base, candidate, patch, version: request.version, expires: now() + reviewLifetime });
        return { reviewId, projectId, branch: base.branch, previous, version: request.version, diff: patch };
      });
    } finally { preparing = false; }
  };
}
