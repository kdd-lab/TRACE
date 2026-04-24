// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import { InstanceView, preprocessData } from './fiper';
import { flattenInstanceOptions, instanceCatalog } from './instances';
import './styles.css';

import * as d3 from 'd3';

const instanceView = InstanceView();

const selectNode = d3.select('#instance');
const statusNode = d3.select('#viewer-status');
const availableOptions = flattenInstanceOptions(instanceCatalog);

function setStatus(message, isError = false) {
  statusNode.text(message);
  statusNode.classed('error', isError);
}

function syncUrl(path) {
  const url = new URL(window.location.href);
  url.searchParams.set('instance', path);
  window.history.replaceState({}, '', url);
}

async function renderPath(path) {
  setStatus('Loading instance...');
  try {
    const data = await d3.json(path);
    const explanationDescriptor = preprocessData(data);
    d3.select('#app').datum(explanationDescriptor).call(instanceView);
    setStatus('New instance loaded');
  } catch (error) {
    console.error(error);
    setStatus('Error loading instance.', true);
  }
}

function buildSelectOptions() {
  const selectEl = selectNode.node();
  if (!selectEl) {
    return;
  }

  instanceCatalog.forEach((dataset) => {
    const group = document.createElement('optgroup');
    group.label = dataset.label;

    dataset.options.forEach((optionItem) => {
      const option = document.createElement('option');
      option.value = optionItem.value;
      option.textContent = optionItem.label;
      group.appendChild(option);
    });

    selectEl.appendChild(group);
  });
}

function resolveInitialPath() {
  const requestedPath = new URL(window.location.href).searchParams.get('instance');
  const exists = availableOptions.some((entry) => entry.value === requestedPath);
  if (exists) {
    return requestedPath;
  }

  return availableOptions[0]?.value;
}

async function initViewer() {
  buildSelectOptions();

  const initialPath = resolveInitialPath();
  if (!initialPath) {
    setStatus('No instance configured.', true);
    return;
  }

  selectNode.property('value', initialPath);
  await renderPath(initialPath);
  syncUrl(initialPath);

  selectNode.on('change', async () => {
    const path = selectNode.property('value');
    await renderPath(path);
    syncUrl(path);
  });
}

initViewer();
