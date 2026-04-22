const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const webRoot = path.join(projectRoot, "apps", "web");

function resolveMaybeFile(candidate) {
  const variations = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    `${candidate}.jsx`,
    `${candidate}.mjs`,
    `${candidate}.cjs`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
    path.join(candidate, "index.jsx")
  ];

  for (const variation of variations) {
    if (fs.existsSync(variation) && fs.statSync(variation).isFile()) {
      return variation;
    }
  }

  return null;
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(specifier, parent, isMain, options) {
  if (specifier.startsWith("@/")) {
    const resolved = resolveMaybeFile(path.join(webRoot, specifier.slice(2)));
    if (resolved) {
      return resolved;
    }
  }

  if ((specifier.startsWith(".") || specifier.startsWith("/")) && specifier.endsWith(".js")) {
    const parentDir = parent?.filename ? path.dirname(parent.filename) : projectRoot;
    const resolved = resolveMaybeFile(path.resolve(parentDir, specifier.slice(0, -3)));
    if (resolved) {
      return resolved;
    }
  }

  return originalResolveFilename.call(this, specifier, parent, isMain, options);
};

const originalLoad = Module._load;
globalThis.__biaOpsTestSessionCookie = null;
Module._load = function load(request, parent, isMain) {
  if (request === "next/headers") {
    return {
      cookies() {
        return {
          get(name) {
            if (name === "bia_ops_session" && globalThis.__biaOpsTestSessionCookie) {
              return { value: globalThis.__biaOpsTestSessionCookie };
            }
            return undefined;
          }
        };
      }
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      sourceMap: false,
      importHelpers: false,
      isolatedModules: true
    },
    fileName: filename
  });

  module._compile(transpiled.outputText, filename);
};

async function runSection(label, run) {
  process.stdout.write(`Running ${label}... `);
  await run();
  process.stdout.write("OK\n");
}

async function main() {
  const { runSharedTests } = require("./shared.test.ts");
  const { runApiTests } = require("./api.test.ts");
  const { runApiSecurityContractTests } = require("./api.test.ts");
  const { runEnvAliasContractTests } = require("./api.test.ts");
  const { runWebTests } = require("./web.test.ts");
  const { runWebOperationalTests } = require("./web.test.ts");

  await runSection("shared helpers", runSharedTests);
  await runSection("api routes", runApiTests);
  await runSection("api security contracts", runApiSecurityContractTests);
  await runSection("api env aliases", runEnvAliasContractTests);
  await runSection("web routes", runWebTests);
  await runSection("web operational routes", runWebOperationalTests);

  console.log("All tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
