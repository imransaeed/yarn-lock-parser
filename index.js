const lockfile = require("@yarnpkg/lockfile");
const fs = require("fs");

const parseYarnLock = async (fileContents) => {
  const canBeUpgraded = (packageName) => {
    return packageName.substring(1).split("@")[1].indexOf("^") == 0
      ? "Yes"
      : "No";
  };

  const packages = lockfile.parse(fileContents);

  const dependencies = new Map();

  for (const [key, value] of Object.entries(packages.object)) {
    const name = key.substring(0, key.indexOf("@", 1));
    const source = `${name}@${value.version}`;
    const packageDependencies = Object.entries({
      ...value.optionalDependencies,
      ...value.dependencies,
    });

    if (packageDependencies.length === 0) {
      const usageMap = dependencies.get(source) || {};
      usageMap.canBeUpgraded = canBeUpgraded(key);
      usageMap.resolved = value.resolved;
      usageMap.usedBy = usageMap.usedBy || new Set();
      dependencies.set(source, usageMap);
    } else {
      for (const [depkey, depvalue] of packageDependencies) {
        const depTargetKey = `${depkey}@${depvalue}`;
        const depTargetObject = packages.object[depTargetKey];
        const depTarget = depTargetObject
          ? `${depkey}@${depTargetObject.version}`
          : depTargetKey;

        const usageMap = dependencies.get(depTarget) || {};

        usageMap.canBeUpgraded = canBeUpgraded(depTargetKey);
        usageMap.resolved = depTargetObject
          ? depTargetObject.resolved || ""
          : "";
        usageMap.usedBy = usageMap.usedBy || new Set();
        usageMap.usedBy.add(source);

        dependencies.set(depTarget, usageMap);
      }
    }
  }

  const sortedDependencies = new Map(
    [...dependencies].sort((a, b) => String(a[0]).localeCompare(b[0]))
  );
  const sortedDependenciesArray = [];
  for (const [key, value] of sortedDependencies) {
    sortedDependenciesArray.push({
      packageName: key,
      usageMap: {
        resolved: value.resolved,
        usedBy: [...value.usedBy],
        canBeUpgraded: value.canBeUpgraded,
      },
    });
  }

  return sortedDependenciesArray;
};

const main = async () => {
  const filePath = process.argv[2];
  const outputFilePath = process.argv[3] || `${filePath}.csv`;
  const fileContents = fs.readFileSync(filePath, "utf8");
  const result = await parseYarnLock(fileContents);
  const csvHeader = "Package, Resolved Url, Can be Upgraded?, Used By...";
  const csv =
    csvHeader +
    "\n" +
    result
      .map(
        (x) =>
          `${x.packageName},${x.usageMap.resolved},${
            x.usageMap.canBeUpgraded
          },${[...x.usageMap.usedBy].join(",")}`
      )
      .join("\n");

  fs.writeFileSync(outputFilePath, csv);
};

main();
