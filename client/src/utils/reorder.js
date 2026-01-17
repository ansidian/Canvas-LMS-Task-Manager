export const reorderSubset = (fullIds, orderedSubsetIds) => {
  const subsetSet = new Set(orderedSubsetIds);
  const reordered = [];
  let subsetIndex = 0;

  for (const id of fullIds) {
    if (subsetSet.has(id)) {
      reordered.push(orderedSubsetIds[subsetIndex]);
      subsetIndex += 1;
    } else {
      reordered.push(id);
    }
  }

  return reordered;
};
