"use strict";
// const applyLineDiff = (oldText: string, diffText: string) => {
//   let oldLines = oldText.split("\n");
//   const diffLines = diffText.trim().split("\n");
//   for (const line of diffLines) {
//     const match = line.match(/Line:(\d+)-?(\d+)?\s*(Modified|Added|Deleted)\s*->\s*(.*)/);
//     if (!match) {
//       console.warn(`Skipping invalid diff line: ${line}`);
//       continue;
//     }
//     let [, start, end, changeType, newContent] = match;
//     start = parseInt(start) - 1; // Convert to 0-based index
//     end = end ? parseInt(end) - 1 : start;
//     if (start < 0 || start >= oldLines.length || end >= oldLines.length) {
//       console.warn(`Skipping invalid line reference: ${line}`);
//       continue;
//     }
//     if (changeType === "Modified") {
//       // Replace range with new content
//       oldLines.splice(start, end - start + 1, newContent);
//     } else if (changeType === "Added") {
//       // Insert new content at start position
//       oldLines.splice(start, 0, newContent);
//     } else if (changeType === "Deleted") {
//       // Remove the range of lines
//       oldLines.splice(start, end - start + 1);
//     }
//   }
//   return oldLines.join("\n");
// };
