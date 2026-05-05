const abaloneInstances = [72, 1162, 1245, 560, 1004, 775, 1, 609, 958, 760, 663, 460, 279, 43, 1182, 645, 691, 1183, 326, 415];

const germanInstances = [218, 260, 200, 77, 109, 198, 272, 78, 100, 236, 59, 234, 108, 243, 252, 56, 92, 145, 298, 42];

const irisInstances = [19, 3, 27, 30, 6, 9, 17, 20, 24, 41, 23, 13, 22, 16, 26, 36, 11, 33, 12, 25];

function buildDatasetEntries(datasetLabel, basePath, ids) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return ids.map((id) => ({
    label: `${datasetLabel} - Instance ${id}`,
    value: `${base}${basePath}/instance_${id}.json`,
  }));
}

export const instanceCatalog = [
  {
    label: 'Abalone',
    options: buildDatasetEntries('Abalone', '/static/abalone_explanations', abaloneInstances),
  },
  {
    label: 'German',
    options: buildDatasetEntries('German', '/static/german_explanations', germanInstances),
  },
  {
    label: 'Iris',
    options: buildDatasetEntries('Iris', '/static/iris_explanations', irisInstances),
  },
];

export function flattenInstanceOptions(catalog) {
  return catalog.flatMap((dataset) => dataset.options);
}
