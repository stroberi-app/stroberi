const { withDangerousMod, withXcodeProject } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const INTENT_FILES = [
  "IntentDatabaseHelper.swift",
  "LogTransactionIntent.swift",
  "ShortcutsModule.swift",
  "ShortcutsModule.m",
];

const BRIDGING_HEADER_IMPORT = "#import <React/RCTBridgeModule.h>";

/**
 * Ensure the app's bridging header imports RCTBridgeModule so Swift
 * native modules can reference RCTPromiseResolveBlock / RCTPromiseRejectBlock.
 *
 * The bridging header isn't present when early dangerous mods run, so we
 * patch it from within the Xcode project mod — by that point the template
 * has been written to disk.
 */
function patchBridgingHeader(platformProjectRoot, projectName) {
  const headerPath = path.join(
    platformProjectRoot,
    projectName,
    `${projectName}-Bridging-Header.h`
  );

  if (!fs.existsSync(headerPath)) {
    return;
  }

  const current = fs.readFileSync(headerPath, "utf8");
  if (current.includes(BRIDGING_HEADER_IMPORT)) {
    return;
  }

  const trimmed = current.trimEnd();
  const next = `${trimmed}\n\n${BRIDGING_HEADER_IMPORT}\n`;
  fs.writeFileSync(headerPath, next, "utf8");
}

/**
 * Copy intent source files from plugins/intents/ into ios/<ProjectName>/Intents/
 * so they survive `expo prebuild --clean`.
 */
function withCopyIntentFiles(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectName = config.modRequest.projectName || "Stroberi";
      const sourceDir = path.join(__dirname, "intents");
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        projectName,
        "Intents"
      );

      fs.mkdirSync(targetDir, { recursive: true });

      for (const fileName of INTENT_FILES) {
        const src = path.join(sourceDir, fileName);
        const dest = path.join(targetDir, fileName);
        fs.copyFileSync(src, dest);
      }

      return config;
    },
  ]);
}

/**
 * Add the copied intent files to the Xcode project's build sources.
 *
 * Note: libsqlite3 is not explicitly linked here because WatermelonDB's podspec
 * already links it project-wide (s.libraries = 'sqlite3'). If WatermelonDB ever
 * removes this dependency, the App Intent code will need an explicit link added.
 */
function withIntentXcodeProject(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName || "Stroberi";

    patchBridgingHeader(config.modRequest.platformProjectRoot, projectName);

    // Create an empty group. We avoid passing INTENT_FILES to addPbxGroup
    // because that would create file references in addition to the ones
    // addSourceFile creates below, resulting in duplicate entries.
    const intentsGroup = xcodeProject.addPbxGroup(
      [],
      "Intents",
      `${projectName}/Intents`
    );

    // Find the main group and add the Intents group to it
    const mainGroupId = xcodeProject.getFirstProject().firstProject.mainGroup;
    const mainGroup = xcodeProject.getPBXGroupByKey(mainGroupId);

    // Find the project source group (e.g., "Stroberi")
    const projectGroup = mainGroup.children.find(
      (child) => child.comment === projectName
    );

    if (projectGroup) {
      const sourceGroup = xcodeProject.getPBXGroupByKey(projectGroup.value);
      if (sourceGroup) {
        sourceGroup.children.push({
          value: intentsGroup.uuid,
          comment: "Intents",
        });
      }
    }

    // Add each source file to the Intents group and compile sources.
    // Pass only the bare filename — the enclosing group already has
    // path = "Stroberi/Intents", so prefixing here would concatenate
    // the path twice ("Stroberi/Intents/Stroberi/Intents/...").
    for (const fileName of INTENT_FILES) {
      xcodeProject.addSourceFile(
        fileName,
        { target: xcodeProject.getFirstTarget().uuid },
        intentsGroup.uuid
      );
    }

    return config;
  });
}

function withAppIntents(config) {
  config = withCopyIntentFiles(config);
  config = withIntentXcodeProject(config);
  return config;
}

module.exports = withAppIntents;
