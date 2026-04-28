import {
  RULES_COLUMN_WIDTH,
  LABELS_COLUMN_WIDTH,
  GUTTER,
  MENU_HEIGHT,
  CRULES_GRID_COLUMN_WIDTH,
  FONT_SIZE,
  colorSet,
  dispatcher,
  SINGLE_FEATURE_HEIGHT,
  VERTICAL_GUTTER,
} from './constants';

import {
  text2tspan,
  columnLayout as cl,
} from './utilities';

import * as d3 from 'd3';

let FTTemplate = colorSet.default;

function FiperMenuCRule() {
  let bandScale = d3.scaleBand();
  let width = 200;
  bandScale.padding(0.2);

  function me(selection) {
    const explanationDescriptor = selection.datum();

    bandScale.domain(explanationDescriptor.counterRules);
    bandScale.range([0, explanationDescriptor.counterRules.length * CRULES_GRID_COLUMN_WIDTH]);

    const gcRuleButtons = selection.selectAll('g.counterRule')
      .data(d => d.counterRules)
      .join('g')
      .classed('counterRule', true)
      .attr('transform', d => `translate(${bandScale(d)}, 0)`)
      .classed('cursor-manina', true)
      .on('click', (d) => {
        let selectedCounterRule = d3.select(d.target).datum();
        if (explanationDescriptor.selectedCounterRule === selectedCounterRule) {
          selectedCounterRule = 'R9999999';
        } else {
          selectedCounterRule = d3.select(d.target).datum();
        }

        dispatcher.call('changeCounterRule', null, selectedCounterRule);
      });

    gcRuleButtons.selectAll('rect.counterRule')
      .data(d => [d])
      .join('rect')
      .classed('counterRule', true)
      .attr('y', GUTTER)
      .attr('width', bandScale.bandwidth())
      .attr('height', (SINGLE_FEATURE_HEIGHT * 2) - (2 * GUTTER))
      .attr('transform', `translate(0, ${SINGLE_FEATURE_HEIGHT})`)
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5)
      .attr('fill-opacity', 1)
      .attr('fill', d => (d === explanationDescriptor.selectedCounterRule ? FTTemplate.CRULES_COLOR : FTTemplate.BASE_COLOR))
      .attr('stroke', d => (d === explanationDescriptor.selectedCounterRule ? FTTemplate.CRULES_STROKE_COLOR : FTTemplate.BASE_STROKE_COLOR));

    const internalGutter = 2;

    gcRuleButtons.selectAll('rect.toggle')
      .data(d => [d])
      .join('rect')
      .classed('toggle', true)
      .attr('x', internalGutter)
      .attr('width', bandScale.bandwidth() - (internalGutter * 2))
      .attr('height', bandScale.bandwidth() - (internalGutter * 2))
      .attr('transform', `translate(0, ${SINGLE_FEATURE_HEIGHT})`)
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5)
      .attr('fill-opacity', 1)
      .attr('fill', FTTemplate.SECONDARY_BACKGROUND_COLOR)
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .transition()
      .attr('y', d => (d === explanationDescriptor.selectedCounterRule ?
        GUTTER + internalGutter : (SINGLE_FEATURE_HEIGHT * 2)
        - (2 * GUTTER) - (internalGutter * 2)));

    selection.selectAll('line.horizontalLine')
      .data([1, 3])
      .join('line')
      .classed('horizontalLine', true)
      .attr('x1', 0)
      .attr('y1', d => (d * SINGLE_FEATURE_HEIGHT))
      .attr('x2', bandScale.range()[1])
      .attr('y2', d => (d * SINGLE_FEATURE_HEIGHT))
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5);
  }

  // eslint-disable-next-line func-names
  me.bandScale = function (_) {
    if (!arguments.length) return bandScale;
    bandScale = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    bandScale.range([0, width]);
    return me;
  };

  return me;
}

function FiperMenuOrderBy() {
  const orderByOptions = {
    'Feature Importance': true, Alphabetical: false, 'Rules first': false, 'Counter Rules first': false,
  };

  function me(selection) {
    selection.selectAll('text.label')
      .data(d => [d])
      .join('text')
      .classed('label', true)
      .attr('x', 0)
      .attr('y', (SINGLE_FEATURE_HEIGHT) - (FONT_SIZE * 1.25))
      .attr('font-size', FONT_SIZE)
      .attr('font-weight', 400)
      // .attr('dy', '-1em')
      .attr('dx', '0.5em')
      .attr('fill', FTTemplate.TEXT_COLOR)
      .text('ORDER BY');

    const generateEvent = (d) => {
      const selectedKey = d3.select(d.target).datum();
      Object.keys(orderByOptions).forEach((key) => {
        orderByOptions[key] = key === selectedKey;
      });
      dispatcher.call('changeOrder', null, selectedKey);
    };

    selection.selectAll('text.orderBy')
      .data(Object.keys(orderByOptions))
      .join('text')
      .classed('orderBy', true)
      .attr('x', (d, i) => (Math.floor(i / 2) * RULES_COLUMN_WIDTH) / 2)
      .attr('y', (d, i) => ((i % 2) * (SINGLE_FEATURE_HEIGHT)) + SINGLE_FEATURE_HEIGHT + GUTTER)
      .attr('font-size', FONT_SIZE)
      .attr('dy', (SINGLE_FEATURE_HEIGHT / 2) - (FONT_SIZE / 2))
      .attr('dx', '2em') // we leave some space for the checkbox
      .attr('fill', FTTemplate.TEXT_COLOR)
      .attr('font-weight', d => (orderByOptions[d] ? 500 : 400))
      .text(d => d)
      .classed('cursor-manina', true)
      .on('click', generateEvent);

    selection.selectAll('rect.checkbox')
      .data(Object.keys(orderByOptions))
      .join('rect')
      .classed('checkbox', true)
      .attr('x', (d, i) => 2 + ((Math.floor(i / 2) * RULES_COLUMN_WIDTH) / 2) + VERTICAL_GUTTER)
      .attr('y', (d, i) => ((i % 2) * SINGLE_FEATURE_HEIGHT) + SINGLE_FEATURE_HEIGHT + ((SINGLE_FEATURE_HEIGHT / 2) - (FONT_SIZE / 2)))
      .attr('width', FONT_SIZE)
      .attr('height', FONT_SIZE)
      .attr('fill', d => (orderByOptions[d] ? FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR : FTTemplate.SECONDARY_BACKGROUND_COLOR))
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5)
      .classed('cursor-manina', true)
      .on('click', generateEvent);

    selection.selectAll('line.horizontalLine')
      .data([1, 2, 3])
      .join('line')
      .classed('horizontalLine', true)
      .attr('x1', 0)
      .attr('y1', d => (d * SINGLE_FEATURE_HEIGHT))
      .attr('x2', RULES_COLUMN_WIDTH)
      .attr('y2', d => (d * SINGLE_FEATURE_HEIGHT))
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5);

    selection.selectAll('line.verticalLine')
      .data(d => [d])
      .join('line')
      .classed('verticalLine', true)
      .attr('x1', RULES_COLUMN_WIDTH / 2)
      .attr('y1', SINGLE_FEATURE_HEIGHT)
      .attr('x2', RULES_COLUMN_WIDTH / 2)
      .attr('y2', SINGLE_FEATURE_HEIGHT * 3)
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5);
  }

  return me;
}

function FiperChooseTextualFormat() {
  let formatOptions = {
    Textual: false,
    Graphic: true,
  };
  const xScale = d3.scaleBand()
    .domain(Object.keys(formatOptions))
    .range([8, (RULES_COLUMN_WIDTH * 0.55)])
    .paddingInner(0.2)
    .paddingOuter(0.4);

  const colorScale = d3.scaleOrdinal()
    .domain([true, false])
    .range([FTTemplate.OTHER_TEXT_COLOR, FTTemplate.DISTRIBUTION_COLOR]);

  const textColorScale = d3.scaleOrdinal()
    .domain([false, true])
    .range([FTTemplate.INSTANCE_COLOR, FTTemplate.BASE_COLOR]);
  const textWeightScale = d3.scaleOrdinal()
    .domain([false, true])
    .range([400, 500]);


  function me(selection) {
    const generateEvent = (d) => {
      const selectedKey = d3.select(d.target).datum();
      Object.keys(formatOptions).forEach((key) => {
        formatOptions[key] = key === selectedKey;
      });
      dispatcher.call('changeTextualFormat', null, formatOptions);
    };

    selection.selectAll('rect.chooseFormat')
      .data(xScale.domain())
      .join('rect')
      .classed('chooseFormat', true)
      .attr('x', d => xScale(d) + 4)
      .attr('y', (0.5 * FONT_SIZE))
      .attr('width', FONT_SIZE)
      .attr('height', FONT_SIZE)
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5)
      .attr('fill', d => colorScale(formatOptions[d]))
      .classed('cursor-manina', true)
      .on('click', generateEvent);


    selection.selectAll('text.chooseFormat')
      .data(Object.keys(formatOptions))
      .join('text')
      .classed('chooseFormat', true)
      .attr('x', xScale)
      .attr('y', 0.5 * GUTTER)
      .attr('font-size', FONT_SIZE)
      .attr('font-weight', d => textWeightScale(formatOptions[d]))
      .attr('dy', '1em')
      .attr('dx', '1.6em')
      .attr('fill', FTTemplate.TEXT_COLOR)
      .text(d => d)
      .classed('cursor-manina', true)
      .on('click', generateEvent);

    const tokens = [
      {
        label: 'Show',
        anchor: 'end',
        x: xScale('Textual') - (GUTTER),
      },
      // {
      //   label: 'or',
      //   anchor: 'middle',
      //   x: xScale('Graphic') - (1.5 * GUTTER),
      // },
      {
        label: 'Explanation',
        anchor: 'start',
        x: xScale('Graphic') + xScale.bandwidth() + 8,
      },
    ];

    selection.selectAll('text.label')
      .data(tokens)
      .join('text')
      .classed('label', true)
      .attr('x', d => d.x)
      .attr('y', 0.5 * GUTTER)
      .attr('font-size', FONT_SIZE)
      .attr('font-weight', 400)
      .attr('dy', '1em')
      .attr('dx', '0.5em')
      .attr('text-anchor', d => d.anchor)
      .attr('fill', FTTemplate.TEXT_COLOR)
      .text(d => d.label);
  }

  // eslint-disable-next-line func-names
  me.formatOptions = function (_) {
    if (!arguments.length) return formatOptions;
    formatOptions = _;

    return me;
  };

  return me;
}

function FiperMenuProgressHandler() {
  let progressSteps = [];
  const xScale = d3.scaleBand()
    .domain(progressSteps.map(d => d.label))
    .range([cl.dimensions('feature-labels').width / 2, cl.dimensions('feature-labels').width / 1])
    .paddingOuter(0.5);

  function processStep(step) {
    let completed = true;
    const steps = progressSteps.map((d1) => {
      if (d1.name === step.name) {
        completed = !completed;
        return { ...d1, completed: !completed };
      }
      return { ...d1, completed };
    })
      .filter(d1 => d1.completed)
      .map(d1 => d1.name);
    dispatcher.call('changeProgressStep', null, steps);
  }


  function me(selection) {
    const gSteps = selection.selectAll('g.progressStep')
      .data(progressSteps.filter(d => d.visible))
      .join('g')
      .classed('progressStep', true)
      .attr('transform', `translate(${(1.4 * xScale.bandwidth())}, ${0.5 * GUTTER})`);

    gSteps.selectAll('rect.progressButton')
      .data(d => [d])
      .join('rect')
      .classed('progressButton', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', (cl.dimensions('feature-labels').width / 2) - (2.8 * GUTTER))
      .attr('height', 1.5 * GUTTER)
      .attr('fill', d => d.backgroundColor)
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
      .attr('stroke-width', 0.75);


    gSteps.selectAll('text.progressButton')
      .data(d => [d])
      .join('text')
      .classed('progressButton', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', FONT_SIZE)
      .attr('font-weight', 400)
      .attr('dy', '1em')
      .attr('dx', '0.5em')
      .attr('fill', d => d.textColor)
      .text(d => d.label);

    // create the bullets of the progress bar
    const gCircles = selection.selectAll('g.progressBullet')
      .data([1])
      .join('g')
      .classed('progressBullet', true)
      .attr('transform', `translate(${0}, ${0.75 * GUTTER})`);

    gCircles.selectAll('line.filrouge')
      .data([1])
      .join('line')
      .classed('filrouge', true)
      .attr('stroke-width', 0.75)
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
      .attr('x1', xScale(progressSteps[0].label))
      .attr('y1', 0.5 * GUTTER)
      .attr('x2', xScale(progressSteps[4].label))
      .attr('y2', 0.5 * GUTTER);

    gCircles.selectAll('circle.backgroundProgressBullet')
      .data(progressSteps)
      .join('circle')
      .classed('backgroundProgressBullet', true)
      .attr('cx', d => xScale(d.label))
      .attr('cy', 0.5 * GUTTER)
      .attr('r', d => (d.visible ? xScale.bandwidth() / 3 : xScale.bandwidth() / 5))
      .attr('fill', FTTemplate.BACKGROUND_COLOR);


    gCircles.selectAll('circle.progressBullet')
      .data(progressSteps)
      .join('circle')
      .classed('progressBullet', true)
      .attr('cx', d => xScale(d.label))
      .attr('cy', 0.5 * GUTTER)
      .attr('r', d => (d.visible ? xScale.bandwidth() / 3 : xScale.bandwidth() / 5))
      .attr('fill', d => d.backgroundColor)
      .attr('fill-opacity', d => (d.completed ? 1 : 0.6))
      .attr('stroke-width', 0.75)
      .attr('stroke', d => (d.completed ? FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR : FTTemplate.BACKGROUND_COLOR))
      .classed('cursor-manina', true)
      .on('click', (d) => {
        const step = d3.select(d.target).datum();
        processStep(step);
      });


    // create the navigation arrows
    gCircles.selectAll('path.rightArrow')
      .data([1])
      .join('path')
      .classed('rightArrow', true)
      .attr('d', 'M 0 0 l 5 5 l -5 5 Z')
      .attr('fill', FTTemplate.DISTRIBUTION_STROKE_COLOR)
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
      .attr('stroke-width', 0.75)
      .attr('transform', `translate(${xScale(progressSteps[4].label) + (xScale.bandwidth() / 2)}, 0)`)
      .classed('cursor-manina', true)
      .on('click', () => {
        const stepIndex = progressSteps.findIndex(d1 => !d1.completed);
        if ((stepIndex < progressSteps.length) && (stepIndex > -1)) {
          dispatcher.call('changeProgressStep', null, progressSteps.slice(0, stepIndex + 1).map(d => d.name));
        }
      });

    gCircles.selectAll('path.leftArrow')
      .data([1])
      .join('path')
      .classed('leftArrow', true)
      .attr('d', 'M 0 0 l -5 5 l 5 5 Z')
      .attr('fill', FTTemplate.DISTRIBUTION_STROKE_COLOR)
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
      .attr('stroke-width', 0.75)
      .attr('transform', `translate(${xScale.bandwidth() * 1.2}, 0)`)
      .classed('cursor-manina', true)
      .on('click', () => {
        const stepIndex = progressSteps.findLastIndex(d => d.completed);
        if (stepIndex > 0) {
          dispatcher.call('changeProgressStep', null, progressSteps.slice(0, stepIndex).map(d => d.name));
        }
      });

    gCircles.selectAll('path.lastArrow')
      .data([1])
      .join('path')
      .classed('lastArrow', true)
      .attr('d', 'M 0 0 l 5 5 l -5 5 Z M 5 0 l 2 0 l 0 10 l -2 0 Z')
      .attr('fill', FTTemplate.DISTRIBUTION_STROKE_COLOR)
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
      .attr('stroke-width', 0.75)
      .attr('transform', `translate(${xScale(progressSteps[4].label) + xScale.bandwidth()}, 0)`)
      .classed('cursor-manina', true)
      .on('click', () => {
        dispatcher.call('changeProgressStep', null, progressSteps.slice(0, progressSteps.length).map(d => d.name));
      });

    gCircles.selectAll('path.firstArrow')
      .data([1])
      .join('path')
      .classed('firstArrow', true)
      .attr('d', 'M 0 0 l -5 5 l 5 5 Z M -5 0 l -2 0 l 0 10 l 2 0 Z')
      .attr('fill', FTTemplate.DISTRIBUTION_STROKE_COLOR)
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
      .attr('stroke-width', 0.75)
      .attr('transform', `translate(${0.7 * xScale.bandwidth()}, 0)`)
      .classed('cursor-manina', true)
      .on('click', () => {
        dispatcher.call('changeProgressStep', null, progressSteps.slice(0, 1).map(d => d.name));
      });
  }

  // eslint-disable-next-line func-names
  me.progressSteps = function (_) {
    if (!arguments.length) return progressSteps;
    progressSteps = _;
    xScale.domain(progressSteps.map(d => d.label));
    return me;
  };

  return me;
}

function FiperMenuFilterBy() {
  let filterByOptions = {
    noRules: {
      value: false,
      color: FTTemplate.DISTRIBUTION_COLOR,
      width: 4 * FONT_SIZE,
      x: 0,
    },
    Rules: {
      value: false,
      color: FTTemplate.RULE_COLOR,
      width: 4 * FONT_SIZE,
      x: 10 * FONT_SIZE,
    },
    CRules: {
      value: false,
      color: FTTemplate.CRULES_COLOR,
      width: 4 * FONT_SIZE,
      x: 20 * FONT_SIZE,
    },
  };

  function me(selection) {
    const generateEvent = (d) => {
      const selectedKey = d3.select(d.target).datum();
      selectedKey.value = !selectedKey.value;
      dispatcher.call('changeFilter', null, filterByOptions);
    };

    selection.selectAll('text.label')
      .data(d => [d])
      .join('text')
      .classed('label', true)
      .attr('x', 0)
      .attr('y', (FONT_SIZE / 2))
      .attr('font-size', FONT_SIZE)
      .attr('font-weight', 400)
      .attr('dy', '1em')
      .attr('dx', '0.5em')
      .attr('fill', FTTemplate.TEXT_COLOR)
      .text('Show features with ');
    const gCheckboxes = selection.selectAll('g.checkboxes')
      .data([0])
      .join('g')
      .classed('checkboxes', true)
      .attr('transform', `translate(${GUTTER + 72}, ${(FONT_SIZE / 2)})`);

    const gCheckbox = gCheckboxes.selectAll('g.checkbox')
      .data(Object.values(filterByOptions))
      .join('g')
      .classed('checkbox', true)
      .attr('transform', d => `translate(${(3 * GUTTER) + d.x}, ${1})`);

    gCheckbox.selectAll('rect.checkbox')
      .data(d => [d])
      .join('rect')
      .classed('checkbox', true)
      .attr('y',  -2)
      // .attr('x', (d, i) => 2 + ((Math.floor(i) * RULES_COLUMN_WIDTH) / 2) + VERTICAL_GUTTER)
      // .attr('y', (d, i) => SINGLE_FEATURE_HEIGHT + GUTTER)
      .attr('width', d => d.width)
      .attr('height', FONT_SIZE + 4)
      .attr('fill', d => (d.color))
      .attr('fill-opacity', d => (d.value ? 0.8 : 0.2))
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5)
      .classed('cursor-manina', true)
      .on('click', generateEvent);

    gCheckbox.selectAll('text.filterBy')
      .data(d => [d])
      .join('text')
      .classed('filterBy', true)
      // .attr('x', (d, i) => (Math.floor(i) * RULES_COLUMN_WIDTH) / 2)
      // .attr('y', (d, i) => SINGLE_FEATURE_HEIGHT + GUTTER)
      .attr('font-size', FONT_SIZE)
      .attr('dy', (SINGLE_FEATURE_HEIGHT / 2) - (FONT_SIZE / 2))
      .attr('dx', '0.2em') // we leave some space for the checkbox
      .attr('fill', d => (d.value ? FTTemplate.BACKGROUND_COLOR : FTTemplate.TEXT_COLOR))
      .text(d => d.label)
      .classed('cursor-manina', true)
      .on('click', generateEvent);
  }

  // eslint-disable-next-line func-names
  me.filterByOptions = function (_) {
    if (!arguments.length) return filterByOptions;
    filterByOptions = _;

    return me;
  };

  return me;
}

// Format the data (instead of using d3.stack()) and
// filter out 0 values:
// extracted from: https://observablehq.com/@eesur/d3-single-stacked-bar
// eslint-disable-next-line no-unused-vars
function prepareCategoricalValues(data, val) {
  // filter out data that has zero values
  // also get mapping for next placement
  // (save having to format data for d3 stack)
  let cumulative = 0;
  return data.map((d, i) => {
    cumulative += d;
    return {
      value: d,
      // want the cumulative to prior value (start of rect)
      cumulative: cumulative - d,
      instance_value: (val === i) ? 1 : 0,
    };
  }).filter(d => d.value > 0);
}

function prepareClassesProbabilitesValues(data, val) {
  // filter out data that has zero values
  // also get mapping for next placement
  // (save having to format data for d3 stack)
  let cumulative = 0;
  return Object.entries(data).map(([key, d]) => {
    cumulative += d;
    return {
      value: d,
      // want the cumulative to prior value (start of rect)
      cumulative: cumulative - d,
      instance_value: (val === key) ? 1 : 0,
      key: key,
    };
  }).filter(d => d.value > 0);
}

// Reusable tooltip
function TooltipHandler() {
  // Creates the tooltip div and adds it to the body
  const tooltip = d3.select('body')
    .selectAll('div.d3-tooltip')
    .data([1])
    .join('div')
    .attr('class', 'd3-tooltip')
    .style('opacity', 0);

  let tooltipHtml = (d) => {
    const formatter = d3.format('.2%');
    return `<div>Value: ${d.label} (<span style="font-weight: 500">${formatter(d.percent / 100)}</span>)</div>`;
  };

  // Css for the tooltip

  const tooltipStyleText = `
      .d3-tooltip, .d3-tutorial-tooltip {
          position: absolute;
          padding: 4px 8px;
          font-family: 'M PLUS 1 Code', 'Courier New', monospace;
          font-size: 11px;
          color: ${FTTemplate.TEXT_COLOR};
          background: ${FTTemplate.SECONDARY_BACKGROUND_COLOR};
          border-radius: 2px;
          pointer-events: none;
          z-index: 1000;
          max-width: 200px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .d3-tutorial-tooltip {
        border-color: ${FTTemplate.CRULES_COLOR};
        font-family: sans-serif;
        font-size: 12px;
        color: white;
        background: ${FTTemplate.TUTORIAL_COLOR};
        border-radius: 2px;
        line-height: 1.4;
      }
    `;
  d3.select('head').selectAll('style.d3-tooltip')
    .data([1])
    .join('style')
    .classed('d3-tooltip', true)
    .text(tooltipStyleText);

  // Function to handle the tooltip
  function me(selection) {
    selection
      .on('mouseover', (event, d) => {
        // Show the tooltip with a transition
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 0.9);

        // Set the content of the tooltip and position it
        tooltip
          .html(() => tooltipHtml(d))
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`);
      })
      .on('mousemove', (event) => {
        // Update the position of the tooltip
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`);
      })
      .on('click', () => {
        // Hide the tooltip with a transition
        tooltip
          .transition()
          .duration(50)
          .style('opacity', 0);
      })
      .on('mouseout', () => {
        // Hide the tooltip with a transition
        tooltip
          .transition()
          .duration(50)
          .style('opacity', 0);
      });
  }

  // Method to set the content of the tooltip
  // eslint-disable-next-line func-names
  me.html = function (formatter) {
    // eslint-disable-next-line no-use-before-define
    if (!arguments.length) return tooltipHtml;
    tooltipHtml = typeof formatter === 'function' ? formatter : () => formatter;
    return me;
  };

  return me;
}


function FiperMenuClassesBarChart() {
  let width = 200;
  let height = 300;
  const lengthScale = d3.scaleLinear();


  function me(selection) {
    selection.selectAll('rect.pproba')
      .data(d => prepareClassesProbabilitesValues(d.predicted_proba, d.predicted_class))
      .join('rect')
      .classed('pproba', true)
      .attr('x', d => lengthScale(d.cumulative))
      .attr('y', 0)
      .attr('width', d => lengthScale(d.value))
      .attr('height', height)
      .attr('fill', d => (d.instance_value === 1 ? FTTemplate.CATEGORICAL_INSTANCE_COLOR : FTTemplate.DISTRIBUTION_COLOR))
      .attr('stroke', FTTemplate.DISTRIBUTION_STROKE_COLOR)
      .call(TooltipHandler().html(d => `<div style="font-weight: 400">Class: <span style="font-weight: 500">${d.key}</span></div><div style="font-weight: 400">Probability: <span style="font-weight: 500">${d3.format(".2%")(d.value)}</span></div>`))

  }

  // eslint-disable-next-line func-names
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    lengthScale.range([0, width]);
    return me;
  };

  // eslint-disable-next-line func-names
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  return me;
}

function FiperClassificationBox() {
  let width = 200;

  function me(selection) {
    selection.selectAll('rect.classification')
      .data(d => [d])
      .join('rect')
      .classed('classification', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', ((3 * SINGLE_FEATURE_HEIGHT)))
      .attr('stroke', FTTemplate.TEXT_COLOR)
      .attr('stroke-width', 0.5)
      .attr('fill', `${FTTemplate.SECONDARY_BACKGROUND_COLOR}`);

    const formatValue = d3.format('.2%');
    selection.selectAll('text.classification')
      .data(d => [d])
      .join('text')
      .classed('classification', true)
      .attr('x', 2 * GUTTER)
      .attr('y', (2 * GUTTER))
      .attr('font-size', FONT_SIZE)
      .attr('font-weight', 400)
      .attr('dy', '1em')
      .attr('fill', FTTemplate.TEXT_COLOR)
      .html(d => text2tspan(`_*Classification:*_ Predicted class is _*${d.predicted_class}*_ with a probability of _*${formatValue(d.predicted_proba[d.predicted_class])}*_`, 44, GUTTER));

    const pprobaBars = FiperMenuClassesBarChart().width(width - GUTTER)
      .height(SINGLE_FEATURE_HEIGHT / 2);

    selection.selectAll('g.pproba')
      .data(d => [d])
      .join('g')
      .classed('pproba', true)
      .attr('transform', `translate(${GUTTER / 2}, ${(SINGLE_FEATURE_HEIGHT * 2)})`)
      .call(pprobaBars);

    // const nCRules = selection.datum().counterRules.length;

    // const lineSpan = RULES_COLUMN_WIDTH +
    //   (CRULES_GRID_COLUMN_WIDTH * nCRules) + FI_COLUMN_WIDTH + (2 * GUTTER);

    // selection.selectAll('line.horizontalLine')
    //   .data([0])
    //   .join('line')
    //   .classed('horizontalLine', true)
    //   .attr('x1', width + GUTTER)
    //   .attr('y1', d => d * ((3 * SINGLE_FEATURE_HEIGHT) + GUTTER))
    //   .attr('x2', width + GUTTER + lineSpan)
    //   .attr('y2', d => d * ((3 * SINGLE_FEATURE_HEIGHT) + GUTTER))
    //   .attr('stroke', FTTemplate.TEXT_COLOR)
    //   .attr('stroke-width', 0.5)
    //   .attr('stroke-dasharray', ('3, 3'))
    //   .attr('stroke-width', 0.5);
  }

  // eslint-disable-next-line func-names
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return me;
  };

  return me;
}

function FiperInteractiveIndicator() {
  const lineHeight = SINGLE_FEATURE_HEIGHT;

  function me(selection) {
    selection.selectAll('path.interactiveIndicator')
      .data([1])
      .join('path')
      .classed('interactiveIndicator', true)
      .attr('d', `M 0 2 l 0 ${(lineHeight - 5) / 2} l 2 -2 l -2 -2 Z L 0 ${lineHeight - 8}`)
      .attr('stroke-width', 1.5)
      .attr('fill', FTTemplate.TEXT_COLOR)
      .attr('stroke', FTTemplate.TEXT_COLOR);
  }

  return me;
}

function FiperMenuColumnTitles() {
  function me(selection) {
    // horizontal separator lines
    const titleDescriptor = selection.datum();
    const { labels, selectors, CRulesList } = titleDescriptor;

    selection.selectAll('line.horizontalLine')
      .data(labels)
      .join('line')
      .classed('horizontalLine', true)
      .attr('y1', SINGLE_FEATURE_HEIGHT / 2)
      .attr('y2', SINGLE_FEATURE_HEIGHT / 2)
      .attr('x1', (d, i) => cl.dimensions(selectors[i]).x)
      .attr('x2', (d, i) => cl.dimensions(selectors[i]).x + cl.dimensions(selectors[i]).width)
      .attr('stroke', FTTemplate.GRID_COLOR)
      .attr('stroke-width', 1)
      .attr('visibility', (d) => {
        if (d === 'C.Rules' && CRulesList.length <= 1) {
          return 'hidden';
        }
        return 'visible';
      });

    const rects = selection.selectAll('rect.padding')
      .data(labels)
      .join('rect')
      .classed('padding', true)
      .attr('y', SINGLE_FEATURE_HEIGHT / 4)
      .attr('height', SINGLE_FEATURE_HEIGHT / 2)
      .attr('fill', FTTemplate.BACKGROUND_COLOR);
    const tLabels = selection.selectAll('text.label')
      .data(labels)
      .join('text')
      .classed('label', true)
      .attr('x', (d, i) => cl.dimensions(selectors[i]).x + (cl.dimensions(selectors[i]).width / 2))
      .attr('y', SINGLE_FEATURE_HEIGHT / 2)
      .attr('font-size', FONT_SIZE)
      .attr('text-anchor', 'middle')
      .attr('fill', FTTemplate.TEXT_COLOR)
      .attr('cursor', 'default')
      .attr('font-weight', 500)
      .text((d) => {
        if (d === 'C.Rules' && CRulesList.length === 1) {
          return 'C.R';
        } else if (d === 'C.Rules' && CRulesList.length === 0) {
          return '';
        }
        return d;
      });
    // for each element in tLabels
    // get the length of the text
    const textLengths = [];
    // eslint-disable-next-line func-names
    tLabels.each(function () {
      textLengths.push(d3.select(this).node().getComputedTextLength());
    });

    rects
      .attr('x', (d, i) => (cl.dimensions(selectors[i]).x + (cl.dimensions(selectors[i]).width / 2)) - (textLengths[i] / 2))
      .attr('width', (d, i) => textLengths[i]);
  }

  return me;
}

function FiperMenuPaletteSelector() {
  let width = 200;
  const paletteOptions = [
    {
      name: 'Light',
      value: 'default',
      color: colorSet.default.RULE_COLOR,
      icon: 'M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z' +
        'M7.25 0h1.5v3h-1.5zM7.25 13h1.5v3h-1.5zM0 7.25h3v1.5H0zM13 7.25h3v1.5h-3z' +
        'M2.22 2.22l2.12 2.12-1.06 1.06-2.12-2.12zM11.66 11.66l2.12 2.12-1.06 1.06-2.12-2.12z' +
        'M2.22 13.78l2.12-2.12 1.06 1.06-2.12 2.12zM11.66 4.34l2.12-2.12 1.06 1.06-2.12 2.12z',
    },
    {
      name: 'Dark',
      value: 'darkModeColorPalette',
      color: colorSet.darkModeColorPalette.RULE_COLOR,
      icon: 'M8 0c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z' +
        'M8 15c-3.9 0-7-3.1-7-7 0-2.4 1.2-4.6 3.2-5.9-0.1 0.6-0.2 1.3-0.2 1.9 0 4.9 4 8.9 8.9 9-1.3 1.3-3 2-4.9 2z',
    },
    {
      name: 'ColorBlind',
      value: 'grayscaleHighContrast',
      color: colorSet.grayscaleHighContrast.RULE_COLOR,
      icon: 'M0.929,-0.595l-1.178,1.178,3.26,3.26c-.187.446-.323.918-.383,1.417-1.756.896-2.96,2.717-2.96,4.823,0,2.992,2.425,5.417,5.417,5.417,1.075,0,2.074-.317,2.917-.857.842.54,1.842.857,2.917.857,1.069,0,2.063-.312,2.902-.848l1.841,1.841,1.178-1.178L0.929,-0.595ZM7.276,8.109l1.805,1.805c-.347.098-.703.169-1.081.169-.431,0-.838-.084-1.229-.206.032-.64.218-1.235.505-1.768ZM5.083,5.917l1.273,1.273c-.397.624-.677,1.329-.792,2.092-.992-.719-1.647-1.86-1.712-3.16.391-.122.798-.206,1.229-.206h0ZM5.083,14.25c-2.297,0-4.167-1.869-4.167-4.167,0-1.387.687-2.608,1.732-3.367.262,1.761,1.367,3.243,2.895,4.023.142,1.17.657,2.222,1.422,3.04-.567.291-1.202.47-1.882.47h0ZM6.929,11.227c.346.069.704.107,1.071.107s.724-.038,1.071-.107c-.201.699-.565,1.328-1.071,1.825-.505-.497-.869-1.126-1.071-1.825ZM10.917,14.25c-.681,0-1.314-.18-1.882-.47.663-.708,1.121-1.599,1.328-2.583l2.534,2.534c-.588.327-1.26.519-1.981.519ZM8,1.75c1.898,0,3.487,1.284,3.987,3.023-.346-.069-.704-.107-1.071-.107-.702,0-1.365.147-1.979.39l.988.988c.317-.082.648-.128.991-.128.431,0,.838.084,1.229.206-.03.607-.193,1.177-.455,1.687l.922.922c.369-.605.63-1.283.739-2.014,1.045.758,1.733,1.98,1.733,3.367,0,.342-.053.67-.132.988l1,1c.243-.616.382-1.285.382-1.988,0-2.107-1.205-3.927-2.96-4.823-.325-2.681-2.604-4.76-5.373-4.76-1.035,0-2.002.291-2.824.795l.924.924c.569-.297,1.212-.47,1.9-.47h0Z',
    },
  ];

  function me(selection) {
    selection.selectAll('rect.palette-background')
      .data(paletteOptions)
      .join('rect')
      .classed('palette-background', true)
      .attr('x', 0)
      .attr('y', (d, i) => (i * SINGLE_FEATURE_HEIGHT))
      .attr('width', SINGLE_FEATURE_HEIGHT * 0.75)
      .attr('height', SINGLE_FEATURE_HEIGHT * 0.75)
      .attr('fill', FTTemplate.SECONDARY_BACKGROUND_COLOR)
      .attr('stroke', 'none');

    selection.selectAll('path.icon')
      .data(paletteOptions)
      .join('path')
      .classed('icon', true)
      .attr('d', d => d.icon)
      .attr('transform', (d, i) => `translate(3, ${(i * SINGLE_FEATURE_HEIGHT) + 3})`)
      .attr('fill', FTTemplate.OTHER_TEXT_COLOR);

    selection.selectAll('rect.palette')
      .data(paletteOptions)
      .join('rect')
      .classed('palette', true)
      .attr('x', 0)
      .attr('y', (d, i) => (i * SINGLE_FEATURE_HEIGHT) + GUTTER)
      .attr('width', SINGLE_FEATURE_HEIGHT * 0.75)
      .attr('height', SINGLE_FEATURE_HEIGHT * 0.75)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.001)
      .attr('stroke', 'none')
      // .attr('stroke-width', 0.5)
      .attr('cursor', 'pointer')
      .on('click', (d) => {
        const selectedPalette = d3.select(d.target).datum();
        FTTemplate = colorSet[selectedPalette.value];
        dispatcher.call('changePalette', null, selectedPalette);
      });
  }

  // eslint-disable-next-line func-names
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return me;
  };

  return me;
}

function FiperMenu() {
  let width = 200;
  let height = 500;
  const menuOrderBy = FiperMenuOrderBy();
  const menuCRulesCall = FiperMenuCRule();
  const menuFilterBy = FiperMenuFilterBy();
  const chooseFormat = FiperChooseTextualFormat();
  const progressButtons = FiperMenuProgressHandler();
  const menuClassification = FiperClassificationBox()
    .width(LABELS_COLUMN_WIDTH);
  const menuColumnTitles = FiperMenuColumnTitles();
  const menuPaletteSelector = FiperMenuPaletteSelector().width(SINGLE_FEATURE_HEIGHT + GUTTER);
  const interactiveIndicator = FiperInteractiveIndicator();

  function me(selection) {
    // create a group to contain the menu elements:
    // 1. the feature importance
    // 2. the distribution of the values
    // 3. the labels
    const gMenu = selection.selectAll('g.menu')
      .data(d => [d])
      .join('g')
      .classed('menu', true)
      .attr('transform', `translate(0, ${GUTTER})`);

    const explanationDescriptor = selection.datum();
    const CRulesList = explanationDescriptor.counterRules;
    const steps = explanationDescriptor.progressStatus;

    // =========================================================
    //                  Classification Box
    // =========================================================
    const classificationRect = gMenu.selectAll('g.classification')
      .data(d => [d])
      .join('g')
      .classed('classification', true)
      .attr('transform', `translate(${cl.dimensions('feature-labels').x}, ${SINGLE_FEATURE_HEIGHT})`);
    classificationRect.call(menuClassification);
    // =========================================================


    // =========================================================
    //                  Visualization blocks titles
    // =========================================================

    const labels = ['Feature', 'Feature Distribution', 'C.Rules', 'F.I.'].slice(0, steps.length - 1);
    const selectors = ['feature-labels', 'feature-values', 'crule-grid', 'feature-importance'].slice(0, steps.length - 1);
    const titleDescriptor = {
      labels,
      selectors,
      CRulesList,
    };


    const gTitles = selection.selectAll('g.titles')
      .data(d => [d])
      .join('g')
      .classed('titles', true)
      .attr('transform', `translate(0, ${MENU_HEIGHT + SINGLE_FEATURE_HEIGHT})`);

    gTitles.datum(titleDescriptor).call(menuColumnTitles);
    // =========================================================

    // =========================================================
    //                  Palette Selector
    // =========================================================
    const gPalette = gMenu.selectAll('g.palette')
      .data(d => [d])
      .join('g')
      .classed('palette', true)
      .attr('transform', `translate(${cl.dimensions('feature-handler').x}, ${SINGLE_FEATURE_HEIGHT + (GUTTER * 0.5)})`);
    gPalette.call(menuPaletteSelector);


    // =========================================================
    //                  Order By Selector
    // =========================================================
    const gOrder = gMenu.selectAll('g.orderby')
      .data(d => [d])
      .join('g')
      .classed('orderby', true)
      .attr('transform', `translate(${cl.dimensions('feature-values').x}, ${SINGLE_FEATURE_HEIGHT})`);
    gOrder.call(interactiveIndicator);
    gOrder.call(menuOrderBy);
    if (steps.findIndex(d => d === 'Rules') < 0) {
      gOrder.remove();
    }


    // =========================================================

    // =========================================================
    //                   Counter Rules Selector
    // =========================================================
    const menuCRules = gMenu.selectAll('g.cRuleGrid')
      .data(d => [d])
      .join('g')
      .classed('cRuleGrid', true)
      .attr('transform', `translate(${cl.dimensions('crule-grid').x}, ${SINGLE_FEATURE_HEIGHT})`);

    if (selection.datum().counterRules.length > 0) {
      menuCRules.selectAll('text.label')
        .data([1])
        .join('text')
        .classed('label', true)
        .attr('x', GUTTER / 2)
        .attr('y', (SINGLE_FEATURE_HEIGHT / 2) - (FONT_SIZE / 2))
        .attr('dy', '0.70em')
        .attr('text-anchor', 'start')
        .attr('font-size', FONT_SIZE)
        .attr('font-weight', 400)
        .attr('fill', FTTemplate.TEXT_COLOR)
        .text(selection.datum().counterRules.length > 1 ? 'C.Rules' : 'C.R');
    }
    menuCRules.call(menuCRulesCall);
    menuCRules.call(interactiveIndicator);
    if (steps.findIndex(d => d === 'Counter Rules') < 0) {
      menuCRules.remove();
    }

    // =========================================================


    // =========================================================
    //                   Filter By Selector
    // =========================================================
    const gFilter = gMenu.selectAll('g.filter')
      .data(d => [d])
      .join('g')
      .classed('filter', true)
      .attr('transform', `translate(${cl.dimensions('feature-labels').x}, ${4 * SINGLE_FEATURE_HEIGHT})`);

    const filterByOptions = {
      // noRules: {
      //   value: explanationDescriptor.filterNoRules,
      //   color: FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR,
      //   width: 4 * FONT_SIZE,
      //   x: 0,
      // },
      Rules: {
        value: explanationDescriptor.filterRules,
        color: FTTemplate.RULE_COLOR,
        width: 3 * FONT_SIZE,
        x: (FONT_SIZE) - (0.5 * GUTTER),
        label: 'Rules'
      },
      CRules: {
        value: explanationDescriptor.filterCRules,
        color: FTTemplate.CRULES_COLOR,
        width: 7 * FONT_SIZE,
        x: (4 * FONT_SIZE) + ( 0.5 * GUTTER),
        label: 'Counter Rules'
      },
    };
    menuFilterBy.filterByOptions(filterByOptions);
    gFilter.call(interactiveIndicator);
    gFilter.call(menuFilterBy);
    if (steps.findIndex(d => d === 'Rules') < 0) {
      gFilter.remove();
    }


    // =========================================================

    // =========================================================
    //            Choose Textual Format
    // =========================================================
    const gChooseFormat = gMenu.selectAll('g.chooseFormat')
      .data(d => [d])
      .join('g')
      .classed('chooseFormat', true)
      .attr('transform', `translate(${cl.dimensions('feature-values').x},0)`);

    const formatOptions = {
      Textual: explanationDescriptor.textVersion,
      Graphic: !explanationDescriptor.textVersion,
    };
    chooseFormat.formatOptions(formatOptions);
    gChooseFormat.call(interactiveIndicator);
    gChooseFormat.call(chooseFormat);
    if (steps.findIndex(d => d === 'Rules') < 0) {
      gChooseFormat.remove();
    }
    // =========================================================

    // =========================================================
    //            Progress Disclosure
    // =========================================================
    const gProgress = gMenu.selectAll('g.progress')
      .data(d => [d])
      .join('g')
      .classed('progress', true)
      .attr('transform', `translate(${cl.dimensions('feature-labels').x}, ${0})`);

    const progressSteps = [
      {
        name: 'Classification',
        label: 'Classification',
        tooltip: 'Shows the outcome of the model to be explained',
        completed: false,
        x: cl.dimensions('feature-labels').x,
        y: 0.5 * GUTTER,
        width: cl.dimensions('feature-labels').width / 2,
        backgroundColor: FTTemplate.DISTRIBUTION_COLOR,
        textColor: FTTemplate.TEXT_COLOR,
        showOnlyBullet: true,
        visibleAtStep: 'Anything',
      },
      {
        name: 'Feature Values',
        label: 'Show Features',
        tooltip: 'Shows the list of the features and their values',
        completed: false,
        x: cl.dimensions('feature-labels').x,
        y: (4 * SINGLE_FEATURE_HEIGHT) + (0.5 * GUTTER),
        width: cl.dimensions('feature-labels').width,
        backgroundColor: FTTemplate.DISTRIBUTION_STROKE_COLOR,
        textColor: FTTemplate.TEXT_COLOR,
        showOnlyBullet: false,
        visibleAtStep: 'Classification',
      },
      {
        name: 'Rules',
        label: 'Rules',
        tooltip: 'Shows the rule based explanation',
        completed: false,
        x: cl.dimensions('feature-labels').x + (cl.dimensions('feature-labels').width / 2),
        y: 0.5 * GUTTER,
        width: cl.dimensions('feature-labels').width / 2,
        backgroundColor: FTTemplate.RULE_COLOR,
        textColor: FTTemplate.TEXT_COLOR,
        showOnlyBullet: false,
        visibleAtStep: 'Feature Values',
      },
      {
        name: 'Counter Rules',
        label: 'Counter Rules',
        tooltip: 'Shows the counter rules',
        completed: false,
        x: cl.dimensions('feature-values').x + (((cl.dimensions('feature-values').width / 3) * 2)),
        y: 0.5 * GUTTER,
        width: cl.dimensions('feature-values').width / 3,
        backgroundColor: FTTemplate.CRULES_COLOR,
        textColor: FTTemplate.SECONDARY_BACKGROUND_COLOR,
        showOnlyBullet: false,
        visibleAtStep: 'Rules',
      },
      {
        name: 'Feature Importance',
        label: 'Feat. Importance',
        tooltip: 'Shows the feature importance',
        completed: false,
        x: cl.dimensions('crule-grid').x,
        y: 0.5 * GUTTER,
        width: cl.dimensions('feature-importance').width,
        backgroundColor: FTTemplate.FI_POSITIVE_COLOR,
        textColor: FTTemplate.SECONDARY_BACKGROUND_COLOR,
        showOnlyBullet: false,
        visibleAtStep: 'Counter Rules',
      },
    ];
    const progressStatus = explanationDescriptor.progressStatus;
    progressSteps.forEach((step) => {
      const found = progressStatus.findIndex(d => d === step.name) > -1;
      // eslint-disable-next-line no-param-reassign
      step.completed = found;
      // eslint-disable-next-line no-param-reassign
      step.visible = false;
    });
    const currentStep = progressSteps.findLast(d => d.completed);
    progressSteps.forEach((step) => {
      if (step.name === currentStep.name) {
        // eslint-disable-next-line no-param-reassign
        step.visible = true;
      }
    });


    progressButtons.progressSteps(progressSteps);
    gProgress.call(interactiveIndicator);
    gProgress.call(progressButtons);
  }
  // eslint-disable-next-line func-names
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  return me;
}

export {
  FiperMenu,
  TooltipHandler,
};
