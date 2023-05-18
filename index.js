const lockfile = require('@yarnpkg/lockfile');
const fs = require("fs");

const parseYarnLock = async (fileContents) => {
  const packages = lockfile.parse(fileContents);

  const dependencies = new Map;

    for (const [key, value] of Object.entries(packages.object)) {
        const name = key.substring(0, key.indexOf("@", 1));
        const source = `${name}@${value.version}`;

        for (const [depkey, depvalue] of Object.entries({...value.optionalDependencies, ...value.dependencies})) {
            const depTargetKey = `${depkey}@${depvalue}`;
            const depTargetObject = packages.object[depTargetKey];
            const depTarget = depTargetObject ? `${depkey}@${depTargetObject.version}` : depTargetKey;

            const usageMap = dependencies.get(depTarget) || {};
            const targetVersionDescriptor = depTargetKey.split("@")[1];

            usageMap.canBeUpgraded = targetVersionDescriptor.indexOf("^") == 0 ? "Yes" : "No";
            usageMap.resolved = depTargetObject ? depTargetObject.resolved || "" : "";
            usageMap.usedBy = usageMap.usedBy || new Set;
            usageMap.usedBy.add(source);

            dependencies.set( depTarget, usageMap )
        }
      }

  const sortedDependencies =  new Map([...dependencies].sort((a, b) => String(a[0]).localeCompare(b[0])));
  const sortedDependenciesArray = [];
  for (const [key, value] of sortedDependencies) { 
    sortedDependenciesArray.push({
      packageName: key,
      usageMap: {resolved: value.resolved, usedBy: [...value.usedBy], canBeUpgraded: value.canBeUpgraded},
    });
  }

  return sortedDependenciesArray;
};

const main = async () => {
  const filePath = process.argv[2];
  const fileContents = fs.readFileSync(filePath, "utf8");
  const result = await parseYarnLock(fileContents);
  const csvHeader = "Package, Resolved Url, Can be Upgraded?, Used By...";
  const csv = csvHeader + "\n" + result.map(x => `${x.packageName},${x.usageMap.resolved},${x.usageMap.canBeUpgraded},${[...x.usageMap.usedBy].join(",")}`).join("\n");
  const csvFileName = `${filePath}.csv`;
  fs.writeFileSync(csvFileName, csv);
}


main();