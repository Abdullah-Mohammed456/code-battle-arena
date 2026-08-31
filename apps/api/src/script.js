// import * as fs from "fs";
// import * as path from "path";

// const folders = [
//   "config",
//   "controllers",
//   "middlewares",
//   "models",
//   "repositories",
//   "types",
//   "routes",
// ];

// folders.forEach((folder) => {
//   const PATH = path.join(process.cwd(), folder);

//   const fileName = folder.endsWith("s") ? folder.slice(0, -1) : folder;
//   const fullName = `execution.${fileName}.ts`;

//   const FullPath = path.join(PATH, fullName);

//   if (!fs.existsSync(FullPath)) {
//     fs.writeFileSync(FullPath, "");
//   }
// });
