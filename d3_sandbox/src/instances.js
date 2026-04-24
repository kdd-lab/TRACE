const abaloneInstances = [
  62, 83, 1073
];

const germanInstances = [11, 17, 70, 55];

const irisInstances = [20, 34, 39];

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
