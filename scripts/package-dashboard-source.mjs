import fs from "node:fs/promises";
import path from "node:path";
import catalogue from "../app/studio/package-dashboard-catalogue.json" with { type: "json" };

const registry = "https://npm.pkg.github.com";
const scope = "@andrewcharlesmoss";
export const packageTargets = {
  "acm-studio": { directory: "", manifestName: "acm-studio", section: "dependencies" },
  "acm-account": { directory: "web", manifestName: "acm-account-web", section: "dependencies" },
  "project-ports": { directory: "scripts/icons", manifestName: "project-ports-icons", section: "devDependencies" },
};

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
function parseVersion(value) {
  if (typeof value !== "string" || value.length > 100) return null;
  const match = versionPattern.exec(value);
  if (!match) return null;
  const prerelease = match[4]?.split(".");
  if (prerelease?.some(part => /^0\d+$/.test(part))) return null;
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  }
  if (!a.prerelease || !b.prerelease) return Number(!a.prerelease) - Number(!b.prerelease);
  for (let i = 0; i < Math.min(a.prerelease.length, b.prerelease.length); i++) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === y) continue;
    const numericX = /^\d+$/.test(x);
    const numericY = /^\d+$/.test(y);
    if (numericX && numericY) return BigInt(x) < BigInt(y) ? -1 : 1;
    if (numericX !== numericY) return numericX ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return Math.sign(a.prerelease.length - b.prerelease.length);
}

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

async function readWorkspaceJson(root, file, maxBytes = 4 * 1024 * 1024) {
  if (!isWithin(root, file)) return null;
  try {
    const real = await fs.realpath(file);
    if (!isWithin(root, real)) return null;
    const stat = await fs.stat(real);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    const data = JSON.parse(await fs.readFile(real, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? { data, real } : null;
  } catch {
    return null;
  }
}

async function isWorkspaceLink(root, target) {
  try {
    const parent = await fs.realpath(path.dirname(target));
    return isWithin(root, parent) && (await fs.lstat(path.join(parent, path.basename(target)))).isSymbolicLink();
  } catch {
    return false;
  }
}

export function registryArchive(value, name, version) {
  try {
    const url = new URL(value);
    return url.origin === registry && !url.username && !url.password && !url.search && !url.hash
      && decodeURIComponent(url.pathname).startsWith(`/download/${name}/${version}/`);
  } catch {
    return false;
  }
}

function declaredLabel(value) {
  // Keep specs useful without returning paths, URLs or embedded credentials.
  if (value.startsWith("file:") || value.startsWith("link:") || value.startsWith("workspace:")) return "Local source";
  if (/^[\w\d. +*~^<>=|!-]{1,100}$/.test(value)) return value;
  return "Custom source";
}

async function readConsumer(root, directory) {
  const [manifest, lock] = await Promise.all([
    readWorkspaceJson(root, path.join(directory, "package.json")),
    readWorkspaceJson(root, path.join(directory, "package-lock.json")),
  ]);
  return Promise.all(catalogue.packages.map(async ({ id }) => {
    if (!manifest) return { id, state: "unavailable" };
    const dependencies = { ...manifest.data.peerDependencies, ...manifest.data.devDependencies,
      ...manifest.data.dependencies, ...manifest.data.optionalDependencies };
    const name = `${scope}/${id}`;
    const legacy = `@acm/${id}`;
    const dependency = typeof dependencies[name] === "string" ? name : legacy;
    const spec = dependencies[dependency];
    if (typeof spec !== "string") return { id, state: "unused" };

    const installedDirectory = path.join(directory, "node_modules", dependency);
    const location = path.join(installedDirectory, "package.json");
    const [installed, linked] = await Promise.all([
      readWorkspaceJson(root, location),
      isWorkspaceLink(root, installedDirectory),
    ]);
    const entry = lock?.data.packages?.[`node_modules/${dependency}`];
    const declared = declaredLabel(spec);
    const installedVersion = installed?.data.name === dependency && parseVersion(installed.data.version) ? installed.data.version : null;
    const localPath = /^(?:file|link):(.+)$/.exec(spec)?.[1];
    if (localPath || spec.startsWith("workspace:") || entry?.link === true || linked || (installed && installed.real !== location)) {
      if (localPath) {
        const target = path.resolve(directory, localPath);
        if (isWithin(root, target)) {
          try {
            const realTarget = await fs.realpath(target);
            if (isWithin(root, realTarget)) {
              const source = await readWorkspaceJson(root, path.join(realTarget, "package.json"));
              const version = source?.data.name === dependency && parseVersion(source.data.version) ? source.data.version : null;
              if (version) return { id, state: "local", declared, version };
              if ((await fs.stat(realTarget)).isFile() && installedVersion) {
                return { id, state: "local", declared, version: installedVersion };
              }
            }
          } catch (error) {
            if (error.code === "ENOENT" || error.code === "ENOTDIR") return { id, state: "broken", declared };
          }
        }
        return { id, state: "unidentified", declared };
      }
      const state = installedVersion ? "local" : installed ? "unidentified" : "broken";
      return { id, state, declared, version: installedVersion };
    }

    const locked = dependency === name && parseVersion(entry?.version) && registryArchive(entry.resolved, name, entry.version)
      ? entry.version : null;
    if (installedVersion) {
      return { id, state: installedVersion === locked ? "installed" : "unidentified", declared, version: installedVersion, locked };
    }
    if (installed) return { id, state: "unidentified", declared, locked };
    return { id, state: locked ? "locked" : "missing", declared, version: locked };
  }));
}

export async function packageRegistryMetadata(id, token, fetchRelease = fetch) {
  const response = await fetchRelease(`${registry}/${encodeURIComponent(`${scope}/${id}`)}`, {
    headers: { accept: "application/vnd.npm.install-v1+json", authorization: `Bearer ${token}` },
    redirect: "error",
    signal: AbortSignal.timeout(4000),
  });
  return response.ok ? response.json() : null;
}

export function publishedPackageReleases(id, metadata) {
  const name = `${scope}/${id}`;
  return Object.entries(metadata?.versions ?? {}).filter(([version, item]) =>
    parseVersion(version) && registryArchive(item?.dist?.tarball, name, version));
}

async function readRelease({ id, verifiedVersion }, token, fetchRelease) {
  if (token) {
    const name = `${scope}/${id}`;
    try {
      const metadata = await packageRegistryMetadata(id, token, fetchRelease);
      const version = metadata?.["dist-tags"]?.latest;
      if (parseVersion(version) && registryArchive(metadata.versions?.[version]?.dist?.tarball, name, version)) {
        const publishedVersions = publishedPackageReleases(id, metadata)
          .map(([publishedVersion]) => publishedVersion)
          .sort((left, right) => compareVersions(right, left));
        return { id, version, source: "registry", publishedVersions };
      }
    } catch {
      // The authenticated registry is optional during local development.
    }
  }
  return { id, version: verifiedVersion, source: "verified", checkedAt: catalogue.checkedAt };
}

export async function readPackageDashboard({ workspace, studio, token, fetchRelease = fetch }) {
  const root = await fs.realpath(workspace);
  const studioRoot = studio ? await fs.realpath(studio) : path.join(root, "acm-studio");
  const [projects, releases] = await Promise.all([
    Promise.all(catalogue.projects.map(async ({ id }) => {
      const directory = id === "acm-studio" ? studioRoot : path.join(root, id, packageTargets[id].directory);
      const boundary = id === "acm-studio" && !isWithin(root, directory) ? directory : root;
      return { id, packages: await readConsumer(boundary, directory) };
    })),
    Promise.all(catalogue.packages.map(pkg => readRelease(pkg, token, fetchRelease))),
  ]);
  const versions = new Map(releases.map(release => [release.id, release.version]));
  return {
    available: true,
    releases,
    projects: projects.map(project => ({
      id: project.id,
      packages: project.packages.map(installed => ({
        ...installed,
        comparison: installed.state === "installed" || installed.state === "locked"
          ? compareVersions(installed.version, versions.get(installed.id))
          : null,
      })),
    })),
  };
}
