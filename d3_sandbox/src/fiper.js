import {FiperMenu, TooltipHandler} from './fiper_menu';
import {
  colorSet,
  CRULES_GRID_COLUMN_WIDTH,
  dispatcher,
  FI_COLUMN_WIDTH,
  FONT_SIZE,
  GLOBAL_WIDTH,
  GUTTER,
  LABELS_COLUMN_WIDTH,
  MENU_HEIGHT,
  RULES_COLUMN_WIDTH,
  SINGLE_FEATURE_HEIGHT,
  VERTICAL_GUTTER,
} from './constants';

import { predicate2text, text2tspan, text2html, columnLayout as cl } from './utilities';

import * as d3 from 'd3';

function fontScaleFactor(fontSize) {
  const cWidthFactor = d3.scaleLinear()
    .domain([8, 13])
    .range([2, 2.6]);
  const fontScale = d3.scaleLinear()
    .domain([0, 10])
    .range([0, fontSize]);
  return Math.floor(((LABELS_COLUMN_WIDTH - GUTTER) * cWidthFactor(fontSize)) /
    (fontScale(fontSize)));
}

const maxLabelLength = fontScaleFactor(FONT_SIZE);

// create a function to darken a color using d3

let FTTemplate = colorSet.default;
// Format the data (instead of using d3.stack()) and
// filter out 0 values:
// extracted from: https://observablehq.com/@eesur/d3-single-stacked-bar
function prepareCategoricalValues(data) {
  const total = d3.sum(data, d => d.eda.count);

  // use a scale   to get percentage values
  const percent = d3.scaleLinear()
    .domain([0, total])
    .range([0, 100]);
  // filter out data that has zero values
  // also get mapping for next placement
  // (save having to format data for d3 stack)
  let cumulative = 0;
  data.sort((a, b) => b.eda.count - a.eda.count);
  return data.map((d) => {
    cumulative += d.eda.count;
    return {
      value: d.eda.count,
      // want the cumulative to prior value (start of rect)
      cumulative: cumulative - d.eda.count,
      label: d.eda.category,
      percent: percent(d.eda.count),
      instance_value: d.instance_value,
      predicates: d.predicates,
      name: d.name,
    };
  }).filter(d => d.value > 0);
}

function FIPERFeatureInstanceValueView() {
  let width = RULES_COLUMN_WIDTH;
  let height = 51110;
  const barLength = d3.scaleLinear()
    .range([0, width])
    .domain([0, 1]);

  function me(selection) {
    const fTooltip = TooltipHandler();
    if (selection.datum().type === 'categorical') {
      // draw the symbol for the actual value of the instance
      const total = d3.sum(selection.datum().values, d => d.eda.count);
      barLength.domain([0, total]);
      selection.selectAll('rect.instance-value')
        .data(d => prepareCategoricalValues(d.values).filter(v => v.instance_value > 0))
        .join('rect')
        .classed('instance-value', true)
        .attr('x', d => barLength(d.cumulative))
        // .attr('y', height / 6)
        .attr('width', d => barLength(d.value))
        .attr('height', height)
        .attr('fill', FTTemplate.CATEGORICAL_INSTANCE_COLOR)
        // .attr('fill-opacity', 0.9)
        .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
        .call(fTooltip);
    } else {
      barLength.domain([selection.datum().values[0].eda.min, selection.datum().values[0].eda.max]);
      selection.selectAll('rect.instance-value')
        .data(d => d.values)
        .join('rect')
        .classed('instance-value', true)
        .attr('x', d => (barLength(d.instance_value) - 2))
        // .attr('y', height / 5)
        .attr('width', 1.5)
        .attr('height', height)
        .attr('fill', FTTemplate.INSTANCE_COLOR);
    }

    return me;
  }

  // eslint-disable-next-line
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    barLength.range([0, width]);
    return me;
  };

  // eslint-disable-next-line
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };
  return me;
}

function FIPERNumericDistributionBoxPlotView() {
  let width = RULES_COLUMN_WIDTH;
  let height = 50;
  let xScale = d3.scaleLinear();

  function prepareNumericalValues(data) {
    const eda = data[0].eda;
    return [eda.min, eda.q1, eda.median, eda.q3, eda.max];
  }

  function me(selection) {
    const feature = selection.datum();
    const g = selection.selectAll('g.axis')
      .data(d => [d])
      .join('g')
      .classed('axis', true)
      .attr('transform', `translate(0, ${GUTTER / 2})`);
    g.call(d3.axisBottom(xScale)
      .tickValues(prepareNumericalValues(feature.values)),
    );

    g.selectAll('g.axis .domain')
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR);
    g.selectAll('g.axis .tick line')
      .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR);
    // avoid overlapping labels using vertical offset
    g.selectAll('.tick text')
      .attr('color', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR)
      .attr('transform', (d, i, nodes) => {
        if (i > 0) {
          const prev = nodes[i - 1];
          const prevBox = prev.getBBox();
          const curr = nodes[i];
          const currBox = curr.getBBox();
          const prevWidth = xScale(d3.select(nodes[i - 1]).datum()) + prevBox.width;
          const currWidth = xScale(d);
          // console.log('prevWidth', prevWidth);
          // console.log('currWidth', currWidth);
          const prevParentNodeY = nodes[i - 1].parentNode.querySelector('text').transform.baseVal[0].matrix.f;
          const currParentNodeY = nodes[i].parentNode.transform.baseVal[0].matrix.f;
          // console.log('NOT shifted', d, prevParentNodeY, currParentNodeY);
          // console.log('---');
          // check if the current label overlaps with the previous one
          // and if they are in the same line (y) position of the parent node (g)
          if (prevWidth + 5 > currWidth && prevParentNodeY === currParentNodeY) {
            const offset = (prevBox.y + prevBox.height) - currBox.y;
            // console.log('shifted', d, prevParentNodeY, currParentNodeY);
            const tick = d3.select(curr.parentNode).select('line');
            tick.attr('y2', 18);
            return `translate(0, ${offset})`;
          }
        }
        return 'translate(0, 0)';
      });

    return me;
  }

  // eslint-disable-next-line func-names
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    xScale.range([0, width]);
    return me;
  };

  // eslint-disable-next-line func-names
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.xScale = function (_) {
    if (!arguments.length) return xScale;
    xScale = _;
    return me;
  };

  return me;
}

function FIPERNumericDistributionLineChartView() {
  let width = RULES_COLUMN_WIDTH;
  let height = 50;
  let color = FTTemplate.DISTRIBUTION_COLOR;
  let strokeColor = FTTemplate.DISTRIBUTION_STROKE_COLOR;
  let xScale = d3.scaleLinear();
  const yScale = d3.scaleLinear()
    .domain([0, 1])
    .range([(height * 2) / 3, height / 6]);
  const line = d3.line()
    .x(d => xScale(d.value1))
    .y(d => yScale(d.y1))
    .curve(d3.curveBasis);

  function prepareNumericalValues(data) {
    const eda = data[0].eda;
    const yValues = [0, 0.1, 1.0, 0.1, 0];
    return ['min', 'q1', 'median', 'q3', 'max']
      .map((d, i) => ({
        value1: eda[d],
        y1: yValues[i],
      }));
  }

  function me(selection) {
    selection.selectAll('path.single-linechart-value')
      .data(d => [prepareNumericalValues(d.values)])
      .join('path')
      .classed('single-linechart-value', true)
      .attr('d', d => `${line(d)}Z`)
      .attr('fill', color)
      .attr('fill-opacity', 1)
      .attr('transform', `translate(0, -${SINGLE_FEATURE_HEIGHT / 6})`)
      .attr('stroke', strokeColor);

    return me;
  }

  // eslint-disable-next-line func-names
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    xScale.range([0, width]);
    return me;
  };

  // eslint-disable-next-line func-names
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    yScale.range([height, height / 6]);
    return me;
  };

  // eslint-disable-next-line func-names
  me.color = function (_) {
    if (!arguments.length) return color;
    color = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.strokeColor = function (_) {
    if (!arguments.length) return strokeColor;
    strokeColor = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.xScale = function (_) {
    if (!arguments.length) return xScale;
    xScale = _;
    return me;
  };

  return me;
}

function FIPERTextualExplanationView() {
  let selectedCounterRule = 'C0';

  function me(selection) {
    const areThereAnyRules = Object.keys(selection.datum().ruleText).length +
      Object.keys(selection.datum().cruleText).length;

    // if (areThereAnyRules > 0) {
    //   selection.selectAll('line.separator')
    //     .data(d => [d])
    //     .join('line')
    //     .classed('separator', true)
    //     .attr('x1', 0)
    //     .attr('x2', RULES_COLUMN_WIDTH)
    //     .attr('y1', d => (SINGLE_FEATURE_HEIGHT * (d.rows)) + 10)
    //     .attr('y2', d => (SINGLE_FEATURE_HEIGHT * (d.rows)) + 10)
    //     .attr('stroke', FTTemplate.TEXT_COLOR)
    //     // .attr('stroke-dasharray', ('3, 3'))
    //     .attr('stroke-width', 0.25);
    // }

    if (areThereAnyRules > 0) {
      const gRuleText = selection.selectAll('g.rule-text-explanation')
        .data(d => [d].filter(v => v.rulePredicateMap.R0))
        .join('g')
        .classed('rule-text-explanation', true);

      // create a rectangle that contain a text to be used as background
      gRuleText.selectAll('rect.text-rule-background')
        .data(d => [d])
        .join('rect')
        .classed('text-rule-background', true)
        .attr('x', '-.25ex')
        .attr('y', -(SINGLE_FEATURE_HEIGHT / 2) + 4)
        .attr('width', (7 * 3) + 4)
        .attr('height', SINGLE_FEATURE_HEIGHT / 2)
        .attr('fill', FTTemplate.RULE_COLOR);

      gRuleText.selectAll('text.text-rule')
        .data(d => [d])
        .join('text')
        .classed('text-rule', true)
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-size', FONT_SIZE)
        .attr('fill', FTTemplate.TEXT_COLOR)
        .attr('font-weight', '300')
        .html(d => text2tspan(`<tspan fill='${FTTemplate.SECONDARY_BACKGROUND_COLOR}'>RULE </tspan>${d.ruleText.R0}`, 55, 0))
        .call(TooltipHandler().html(d => `<div>${text2html(`RULE ${d.ruleText.R0}`, 10000)}</div>`));

      let ruleHeight = 0;
      if (Object.keys(selection.datum().ruleText).length) {
        ruleHeight = gRuleText.node().getBBox().height;
      }

      const gCounterRuleText = selection.selectAll('g.counter-rule-text-explanation')
        .data(d => [d].filter(v => v.cRulesRelevanceMap[selectedCounterRule]))
        .join('g')
        .classed('counter-rule-text-explanation', true)
        .attr('transform', `translate(0, ${ruleHeight + (0.5 * GUTTER)})`);

      // create a rectangle that contain a text to be used as background
      gCounterRuleText.selectAll('rect.text-counter-rule-background')
        .data(d => [d])
        .join('rect')
        .classed('text-counter-rule-background', true)
        .attr('x', '-.25ex')
        .attr('y', -(SINGLE_FEATURE_HEIGHT / 2) + 4)
        .attr('width', (22 * 3) + 4)
        .attr('height', SINGLE_FEATURE_HEIGHT / 2)
        .attr('fill', FTTemplate.CRULES_COLOR);

      const makeCRuleText = (d) => {
        const cruleText = text2tspan(`COUNTER RULE ${d.cruleText[selectedCounterRule]}`, 55, 0);
        return cruleText.replace('COUNTER RULE ', `<tspan fill='${FTTemplate.SECONDARY_BACKGROUND_COLOR}'>COUNTER RULE </tspan>`);
      };

      gCounterRuleText.selectAll('text.text-counter-rule')
        .data(d => [d])
        .join('text')
        .classed('text-counter-rule', true)
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-size', FONT_SIZE)
        .attr('fill', FTTemplate.TEXT_COLOR)
        .attr('font-weight', '300')
        .html(makeCRuleText)
        .call(TooltipHandler().html(d => `<div>${text2html(`COUNTER RULE ${d.cruleText[selectedCounterRule]}`, 10000)}</div>`));


      let crHeight = 0;
      if (!gCounterRuleText.empty()) {
        crHeight = gCounterRuleText.node().getBBox().height;
      }
      selection.selectAll('rect.counter-rule-gutter')
        .data(d => [d])
        .join('rect')
        .classed('counter-rule-gutter', true)
        .attr('x', 0)
        .attr('y', crHeight + ruleHeight)
        .attr('width', RULES_COLUMN_WIDTH)
        .attr('height', GUTTER)
        .attr('fill', 'none');
    }

    return me;
  }

  // eslint-disable-next-line
  me.selectedCounterRule = function (_) {
    if (!arguments.length) return selectedCounterRule;
    selectedCounterRule = _;
    return me;
  };


  return me;
}

function FIPERFeatureDistributionView() {
  let width = RULES_COLUMN_WIDTH;
  let height = 5022222;
  const barLength = d3.scaleLinear()
    .range([0, width])
    .domain([0, 1]);
  let color = FTTemplate.DISTRIBUTION_COLOR;
  let strokeColor = FTTemplate.DISTRIBUTION_STROKE_COLOR;
  let fFilterRule = () => true;
  const textualExplanation = FIPERTextualExplanationView();

  const t = d3.transition()
    .duration(500)
    .ease(d3.easeLinear);
  const cTooltip = TooltipHandler();
  const nTooltip = TooltipHandler().html(d => `<div style="font-weight: 500">Value: ${d.values[0].instance_value}</div>
            <div>min: ${d.values[0].eda.min}</div>
            <div>q1: ${d.values[0].eda.q1}</div>
            <div>median: ${d.values[0].eda.median}</div>
            <div>q3: ${d.values[0].eda.q3}</div>
            <div>max: ${d.values[0].eda.max}</div>`);

  function me(selection) {
    const gDetails = selection.selectAll('g.details')
      .data(d => [d].filter(v => v.status === 1))
      .join('g')
      .classed('details', true)
      .attr('transform', `translate(0, ${1.5 * height})`);

    gDetails
      .transition(t).duration(d => (d.status === 1 ? 500 : 100))
      .attr('opacity', d => (d.status === 1 ? 1 : 0));

    const gFeatureValues = gDetails.selectAll('g.feature-values')
      .data(d => [d])
      .join('g')
      .classed('feature-values', true);

    if (selection.datum().type === 'categorical') {
      const total = d3.sum(selection.datum().values, d => d.eda.count);
      barLength.domain([0, total]);

      const gSingleBar = selection.selectAll('g.single-bar')
        .data(d => [d])
        .join('g')
        .classed('single-bar', true);

      gSingleBar.selectAll('rect.single-bar')
        .data(d => prepareCategoricalValues(d.values))
        .join('rect')
        .classed('single-bar', true)
        .attr('x', d => barLength(d.cumulative))
        // .attr('y', height / 6)
        .attr('width', d => barLength(d.value))
        .attr('height', height)
        .attr('fill', color)
        .attr('fill-opacity', 1)
        .attr('stroke', strokeColor)
        .call(cTooltip);

      if (selection.datum().status === 1) {
        // create an element g that will contain each single value of the feature
        // calculate the maximum length of the label to fit the text in the space,
        // considering the font size and the monospace font


        const gFeatureValue = gFeatureValues.selectAll('g.feature-value')
          .data(d => prepareCategoricalValues(d.values))
          .join('g')
          .classed('feature-value', true)
          .attr('transform', (d, i) => `translate(0, ${(i * height * 2) + (height / 2)})`)
          .attr('width', RULES_COLUMN_WIDTH);

        // draw the symbol for the actual value of the instance
        gFeatureValue.selectAll('rect.single-bar')
          .data(d => [d])
          .join('rect')
          .classed('single-bar', true)
          .attr('width', d => barLength(d.value))
          .attr('height', (height))
          .attr('fill', d => (d.instance_value ? FTTemplate.CATEGORICAL_INSTANCE_COLOR : color))
          // .attr('fill-opacity', d => (d.instance_value ? 1 : 0.2))
          .attr('stroke', d => (d.instance_value ? FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR : strokeColor))
          .call(cTooltip);
        // text for the labels for each value of the feature
        gFeatureValue.selectAll('text.single-bar')
          .data(d => [d])
          .join('text')
          .classed('single-bar', true)
          .attr('x', -GUTTER)
          .attr('dy', FONT_SIZE)
          .attr('text-anchor', 'end')
          .attr('font-size', FONT_SIZE)
          .attr('font-weight', d => ((d.instance_value === 1) ? '500' : '400'))
          .attr('fill', d => ((d.instance_value === 1) ? FTTemplate.VALUE_TEXT_COLOR : FTTemplate.OTHER_TEXT_COLOR))
          .text(d => (d.label.length > maxLabelLength ? `${d.label.substring(0, maxLabelLength - 2)}…` : d.label));
        // text for the values for each value of the feature
        gFeatureValue.selectAll('text.single-bar-value')
          .data(d => [d])
          .join('text')
          .classed('single-bar-value', true)
          .attr('x', d => barLength(d.value) + (GUTTER / 2))
          .attr('dy', FONT_SIZE)
          .attr('text-anchor', 'start')
          .attr('font-size', FONT_SIZE)
          .attr('fill', d => ((d.instance_value === 1) ? FTTemplate.VALUE_TEXT_COLOR : FTTemplate.OTHER_TEXT_COLOR))
          .text(d => `${d.percent.toFixed(2)}%`);
      } else {
        gFeatureValues.selectAll('g.feature-value').transition(t).remove();
      }
    } else {
      // Here we have a numerical feature
      barLength.domain([selection.datum().values[0].eda.min, selection.datum().values[0].eda.max]);
      const ndbpv = FIPERNumericDistributionLineChartView()
        .xScale(barLength)
        .width(width)
        .height((SINGLE_FEATURE_HEIGHT * 2) / 3)
        .color(color)
        .strokeColor(strokeColor);
      selection.call(ndbpv).call(nTooltip);


      if (selection.datum().status === 1) {
        const fndlcv = FIPERNumericDistributionBoxPlotView()
          .xScale(barLength)
          .width(width)
          .height(SINGLE_FEATURE_HEIGHT);
        gFeatureValues.call(fndlcv);
      }
    }

    if (selection.datum().status === 1) {
      const bboxValues = gFeatureValues.node().getBBox();

      const gTextualExplanation = gDetails.selectAll('g.g-textual-explanation')
        .data(d => [d])
        .join('g')
        .classed('g-textual-explanation', true)
        .attr('transform', `translate(0, ${bboxValues.height + (0.5 * GUTTER) + SINGLE_FEATURE_HEIGHT})`);

      gTextualExplanation.call(textualExplanation);
    }

    return me;
  }

  // eslint-disable-next-line
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    barLength.range([0, width]);
    return me;
  };

  // eslint-disable-next-line
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.color = function (_) {
    if (!arguments.length) return color;
    color = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.strokeColor = function (_) {
    if (!arguments.length) return strokeColor;
    strokeColor = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.fFilterRule = function (_) {
    if (!arguments.length) return fFilterRule;
    fFilterRule = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.selectedCounterRule = function (_) {
    if (!arguments.length) return textualExplanation.selectedCounterRule();
    textualExplanation.selectedCounterRule(_);
    return me;
  };

  return me;
}

function FIPERRulePredicateView() {
  let width = RULES_COLUMN_WIDTH;
  let height = 50;
  let subHeight = height / 3;
  const barLength = d3.scaleLinear()
    .range([0, width])
    .domain([0, 1]);
  let color = FTTemplate.DISTRIBUTION_COLOR;
  let strokeColor = FTTemplate.DISTRIBUTION_STROKE_COLOR;
  let isFactualRule = true;
  let selectedCounterRule = 'R0';

  function me(selection) {
    const gPredicateBar = selection.selectAll('g.single-predicate')
      .data(d => [d])
      .join('g')
      .classed('single-predicate', true);

    if (selection.datum().type === 'categorical') {
      const total = d3.sum(selection.datum().values, d => d.eda.count);
      barLength.domain([0, total]);

      const gSingleBar = gPredicateBar.selectAll('g.single-predicate-bar')
        .data(d => [d])
        .join('g')
        .classed('single-predicate-bar', true);

      gSingleBar.selectAll('rect.single-predicate-bar')
        .data(d => prepareCategoricalValues(d.values)
          .filter(v => v.predicates[selectedCounterRule] &&
            (v.predicates[selectedCounterRule].exp_value > 0)))
        .join('rect')
        .classed('single-predicate-bar', true)
        .attr('x', d => barLength(d.cumulative))
        .attr('width', d => barLength(d.value))
        .attr('height', height)
        .attr('fill', color)
        // set y attribute to height if isFactualRule is true and
        // predicates[selectedCounterRule].exp_value  == predicate['R0´].exp_value
        .attr('y', d => (!isFactualRule && (d.predicates.R0) && d.predicates[selectedCounterRule].exp_value === d.predicates.R0.exp_value ? height : 0))

        // .attr('fill', `url(#p_RULE_COLOR)`)
        .attr('fill-opacity', 1)
        .attr('stroke', strokeColor);
    } else {
      // Here we have a numerical feature
      barLength.domain([selection.datum().values[0].eda.min, selection.datum().values[0].eda.max]);

      // create a tranformation of the data to create additional fields for ranges
      // of rule predicate
      const ranges = selection.datum().values[0].predicates[selectedCounterRule] || [];
      // check if any of the intervals in ranges intersects the interval in
      // selection.datum().values[0].predicates['R0']
      let intersects = false;
      if (!isFactualRule && ranges.length && selection.datum().values[0].predicates.R0
        && selection.datum().values[0].predicates.R0.length) {
        // there is at least a predicate for the rule
        const r0 = selection.datum().values[0].predicates.R0[0];
        // check if r0 intersercts one of the intervals in ranges
        intersects = ranges.some(d => (d.interval[0] <= r0.interval[1]
          && d.interval[1] >= r0.interval[0]));
      }

      gPredicateBar.selectAll('rect.single-predicate-box')
        .data(ranges)
        .join('rect')
        .classed('single-predicate-box', true)
        .attr('x', d => barLength(d.interval[0]))
        .attr('y', () => (!isFactualRule && intersects ? height : 0))
        .attr('width', d => barLength(d.interval[1]) - barLength(d.interval[0]))
        .attr('height', subHeight)
        .attr('fill', color)
        .attr('fill-opacity', 1)
        .attr('stroke', strokeColor);
    }
    gPredicateBar.call(TooltipHandler().html(d => text2html(`${isFactualRule ? d.ruleText.R0 : d.cruleText[selectedCounterRule]}`, 10000)));
    return me;
  }

  // eslint-disable-next-line
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    barLength.range([0, width]);
    return me;
  };

  // eslint-disable-next-line
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.subHeight = function (_) {
    if (!arguments.length) return subHeight;
    subHeight = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.color = function (_) {
    if (!arguments.length) return color;
    color = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.strokeColor = function (_) {
    if (!arguments.length) return strokeColor;
    strokeColor = _;
    return me;
  };
  // eslint-disable-next-line func-names
  me.isFactualRule = function (_) {
    if (!arguments.length) return isFactualRule;
    isFactualRule = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.selectedCounterRule = function (_) {
    if (!arguments.length) return selectedCounterRule;
    selectedCounterRule = _;
    return me;
  };

  return me;
}

function FIPERFeatureLabelsView() {
  let width = LABELS_COLUMN_WIDTH;
  let height = 50;
  // create a scale to fit the length of the feature name
  const cLenght = d3.scaleLinear()
    .domain([0, maxLabelLength])
    .range([0, width]);

  function me(selection) {
    selection.selectAll('line.background')
      .data(d => [d])
      .join('line')
      .classed('background', true)
      .attr('x1', 0)
      .attr('x2', d => (cLenght(d.rname.length) - GUTTER))
      .attr('x2', d => cLenght(Math.floor(maxLabelLength - d.rname.length)) - (2 * GUTTER))
      .attr('y1', height / 4)
      .attr('y2', height / 4)
      .attr('stroke', FTTemplate.GRID_COLOR)
      .style('stroke-dasharray', ('3, 3'))
      .attr('stroke-width', 0.25);

    selection.selectAll('text.feature-name')
      .data(d => [d])
      .join('text')
      .classed('feature-name', true)
      .attr('x', width)
      .attr('y', FONT_SIZE / 2)
      .attr('text-anchor', 'end')
      .attr('font-size', FONT_SIZE)
      .attr('font-weight', '500')
      .attr('fill', FTTemplate.TEXT_COLOR)
      .text(d => (d.rname.length > maxLabelLength ? `${d.rname.substring(0, maxLabelLength - 2)}…` : d.rname));

    function getFeatureValue(d, maxLength) {
      if (d.type === 'categorical') {
        const label = d.values.filter(v => v.instance_value).map(v => v.eda.category).join(', ');
        return (label.length > maxLength ? `${label.substring(0, maxLength - 2)}…` : label);
      }
      return `${d.values[0].instance_value}`;
    }

    selection.selectAll('text.feature-value')
      .data(d => [d])
      .join('text')
      .classed('feature-value', true)
      .attr('x', width)
      .attr('y', FONT_SIZE + (FONT_SIZE / 2))
      .attr('text-anchor', 'end')
      .attr('font-size', FONT_SIZE)
      .attr('fill', FTTemplate.VALUE_TEXT_COLOR)
      .text(d => getFeatureValue(d, maxLabelLength))
      .attr('opacity', d => ((d.status === 1 && d.type === 'categorical') ? 0 : 1));

    selection.call(TooltipHandler()
      .html(d => `<div style="font-weight: 500">Feature: ${d.rname}</div><div>Value: ${getFeatureValue(d, 10000)}</div>`));
    return me;
  }

  // eslint-disable-next-line
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    cLenght.range([0, width]);
    return me;
  };

  // eslint-disable-next-line
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };
  return me;
}

function FIPERFeatureImportanceView() {
  let width = FI_COLUMN_WIDTH;
  let height = 50000;
  let fiExtent = [0, 1];
  const barLength = d3.scaleLinear()
    .range([0, width])
    .domain(fiExtent);

  /**
   * This function receives one single ```g``` element and visualizes its
   * content using the associated data.
   * @param selection the element containing a single datum with the
   *  metadata of the feature to be visualized.
   */
  function me(selection) {
    selection.selectAll('line.background')
      .data(d => [d])
      .join('line')
      .classed('background', true)
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (height / 2))
      .attr('y2', (height / 2))
      .attr('stroke', FTTemplate.GRID_COLOR)
      .style('stroke-dasharray', ('3, 3'))
      .attr('stroke-width', 0.25);
    selection.selectAll('line.axis')
      .data(d => [d])
      .join('line')
      .classed('axis', true)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', FTTemplate.GRID_COLOR)
      .attr('stroke-width', 0.3);
    selection.selectAll('rect')
      .data(d => [d])
      .join('rect')
      // .attr('x', (width / 2))
      .attr('y', 0)
      .attr('width', d => barLength(Math.abs(d.feature_importance)))
      .attr('height', height)
      .attr('fill', d => (d.feature_importance < 0 ? FTTemplate.NEGATIVE_FI_COLOR : FTTemplate.FI_POSITIVE_COLOR))
      .call(TooltipHandler().html(d => `<div style="font-weight: 400">Feature importance: <span style="font-weight: 500">${d3.format('.2f')(d.feature_importance)}</span></div>`));

    if (selection.datum().status === 1) {
      const axis = d3.axisBottom(barLength)
        .tickValues([...fiExtent, Math.abs(selection.datum().feature_importance)])
        .tickFormat((d, i) => (i > 0 ? `${d3.format('.2f')(d)}` : d))
        .tickSize(6);


      if (selection.datum().feature_importance < 0) {
        axis.tickFormat((d, i) => (i > 0 ? `-${d3.format('.2f')(d)}` : d));
      }

      const gaxis = selection.selectAll('g.fi-axis')
        .data(d => [d])
        .join('g')
        .classed('fi-axis', true)
        .attr('transform', `translate(0, ${(height * 11) / 7})`)
        .call(axis);

      gaxis.select('.domain')
        .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR);


      gaxis.selectAll('g.tick line')
        .attr('y2', (d, i) => (i > 1 ? 18 : 6))
        .attr('stroke-dasharray', ('3, 3'))
        .attr('stroke', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR);

      gaxis.selectAll('g.tick text')
        .attr('y', (d, i) => (i > 1 ? 18 : 9))
        .attr('fill', FTTemplate.CATEGORICAL_INSTANCE_STROKE_COLOR);

      gaxis.selectAll('g.tick text')
        .filter((d, i) => i > 1)
        .attr('fill', () => (selection.datum().feature_importance < 0 ? FTTemplate.NEGATIVE_FI_COLOR : FTTemplate.FI_POSITIVE_COLOR));


      // add a circle on the value of the feature importance
      gaxis.selectAll('circle.fi-value')
        .data(d => [d])
        .join('circle')
        .classed('fi-value', true)
        .attr('cx', d => barLength(Math.abs(d.feature_importance)))
        .attr('cy', 0)
        .attr('r', 3)
        .attr('fill', d => (d.feature_importance < 0 ? FTTemplate.NEGATIVE_FI_COLOR : FTTemplate.FI_POSITIVE_COLOR));
    } else {
      selection.selectAll('g.fi-axis').remove();
    }
  }


  // eslint-disable-next-line
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    barLength.range([0, width]);
    return me;
  };

  // eslint-disable-next-line
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  // eslint-disable-next-line
  me.fitExtent = function (_) {
    if (!arguments.length) return fiExtent;
    fiExtent = _;
    barLength.domain(fiExtent);
    return me;
  };

  return me;
}

function FIPERCRuleGrid() {
  let width = FI_COLUMN_WIDTH;
  let height = 50;
  let cruleList = [];
  let selectedCounterRule = 'C0';
  const bandScale = d3.scaleBand()
    .range([0, width])
    .padding(0.1);

  /**
   * This function receives one single ```g``` element and visualizes its
   * content using the associated data.
   * @param selection the element containing a single datum with the
   *  metadata of the feature to be visualized.
   */
  function me(selection) {
    // we need to scan all the values elements, to extract the exp_value from the dictionary
    // predicates...
    selection.selectAll('line.gridLine')
      .data(Object.keys(selection.datum().cRulesRelevanceMap))
      .join('line')
      .classed('gridLine', true)
      .attr('x1', d => bandScale(d) + (bandScale.bandwidth() / 2))
      .attr('x2', d => bandScale(d) + (bandScale.bandwidth() / 2))
      .attr('y1', -(SINGLE_FEATURE_HEIGHT) / 6)
      .attr('y2', SINGLE_FEATURE_HEIGHT)
      .attr('stroke', FTTemplate.GRID_COLOR)
      .attr('stroke-width', 0.3)
      .attr('stroke-dasharray', ('3, 3'));

    selection.selectAll('circle.predicate')
      .data(bandScale.domain().filter(d => selection.datum().cRulesRelevanceMap[d] > 0))
      .join('circle')
      .classed('predicate', true)
      .attr('cx', d => bandScale(d) + (bandScale.bandwidth() / 2))
      .attr('cy', ((SINGLE_FEATURE_HEIGHT * 3) / 6) / 2)
      .attr('r', d => (selection.datum().cRulesRelevanceMap[d] === 2 ? 6 : 3))
      .attr('fill', d => ((d === selectedCounterRule) ? FTTemplate.CRULES_COLOR : FTTemplate.BASE_COLOR))
      .attr('stroke', d => ((d === selectedCounterRule) ? FTTemplate.CRULES_STROKE_COLOR : FTTemplate.BASE_STROKE_COLOR))
      .call(TooltipHandler().html(d => text2html(selection.datum().cruleText[d], 1000)))
      .classed('cursor-manina', true)
      .on('click', (d) => {
        dispatcher.call('changeCounterRule', this, d3.select(d.target).datum());
        d.stopPropagation(); // this to avoid that the deatils are shown when clicking on the circle
      });
  }

  // eslint-disable-next-line
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    bandScale.range([0, width]);
    return me;
  };

  // eslint-disable-next-line
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  // eslint-disable-next-line
  me.cruleList = function (_) {
    if (!arguments.length) return cruleList;
    cruleList = _;
    bandScale.domain(cruleList);
    return me;
  };

  // eslint-disable-next-line func-names
  me.selectedCounterRule = function (_) {
    if (!arguments.length) return selectedCounterRule;
    selectedCounterRule = _;
    return me;
  };

  // eslint-disable-next-line func-names
  me.bandScale = function () {
    if (!arguments.length) return bandScale;
    return me;
  };

  return me;
}

function FiperMenuTutorial() {
  const infoIconPath = 'M2.87,3.42s.04,.04,.03,.07l-1.58,5.58c-.07,.3-.11,.47-.11,.53,0,.08,.02,.15,.05,.2,.03,.06,.09,.09,.2,.09,.18,0,.41-.15,.7-.46,.17-.18,.38-.44,.63-.78l.2,.17-.08,.11c-.39,.55-.71,.94-.97,1.18-.4,.38-.79,.56-1.17,.56-.22,0-.41-.09-.56-.28s-.22-.41-.22-.66c0-.15,.01-.28,.03-.39,.02-.11,.06-.28,.12-.5L1.26,4.82c.02-.06,.03-.12,.04-.17,.01-.05,.02-.1,.02-.16,0-.19-.07-.3-.21-.35-.14-.04-.41-.07-.82-.07v-.26c.43-.05,.74-.09,.93-.12,.19-.03,.38-.06,.57-.09,.25-.04,.48-.09,.71-.14,.22-.05,.35-.07,.38-.05Zm-.74-1.96c-.15-.17-.23-.37-.23-.6s.08-.44,.23-.61c.15-.17,.33-.25,.55-.25s.4,.08,.55,.25c.15,.17,.23,.37,.23,.61s-.08,.44-.23,.61c-.15,.16-.34,.25-.55,.25s-.4-.08-.55-.25Z';
  const closeIconPath = 'M-0.5,2.5 L4.9,9.5 M4.9,2.5 L-0.5,9.5';
  const buttonList = [
    {
      name: 'Info',
      value: 'info',
      color: colorSet.default.CRULES_COLOR,
      icon: infoIconPath,
    },
    {
      name: 'Next',
      value: 'next',
      color: colorSet.default.CRULES_COLOR,
      // Points shifted slightly right: (5.6,6), (-0.4,2.5), (-0.4,9.5)
      icon: 'M-0.4,2.5 L5.6,6 L-0.4,9.5 Z',
    },
    {
      name: 'Previous',
      value: 'previous',
      color: colorSet.default.CRULES_COLOR,
      // Points shifted slightly left: (4.4,2.5), (-1.6,6), (4.4,9.5)
      icon: 'M4.4,2.5 L-1.6,6 L4.4,9.5 Z',
    },
    {
      name: 'Close',
      value: 'close',
      color: colorSet.default.CRULES_COLOR,
      icon: closeIconPath,
    }
  ];
  const yScale = d3.scaleBand()
    .range([0, buttonList.length * SINGLE_FEATURE_HEIGHT+GUTTER])
    .domain(buttonList.map(d => d.value))
    .padding(0.1);

  // the two buttons prev and next will be shown only when the info button is toggled
  let toggleInfo = false;

  function me(selection) {
    const gBackground = selection.selectAll('g.tutorialBackground')
      .data([null])
      .join('g')
      .classed('tutorialBackground', true);

    // gBackground.selectAll('rect.tutorialBg')
    //   .data([null])
    //   .join('rect')
    //   .classed('tutorialBg', true)
    //   .attr('width', 25)
    //   .attr('height', MENU_HEIGHT - SINGLE_FEATURE_HEIGHT)
    //   .attr('fill', FTTemplate.BACKGROUND_COLOR )
    //   .attr('opacity', toggleInfo ? 1 : 0)
    //   .attr('pointer-events', 'none');

    // Buttons group, translated 10px down
    const gButtonsWrapper = selection.selectAll('g.infoButtonsWrapper')
      .data([null])
      .join('g')
      .classed('infoButtonsWrapper', true)
      .attr('transform', 'translate(0, 3)');

    const gButtons = gButtonsWrapper.selectAll('g.infoButtons')
      .data(toggleInfo ? buttonList : buttonList.filter(d => d.value === 'info'))
      .join('g')
      .attr('class', d => d.value)
      .classed('infoButtons', true)
      .attr('transform', d => `translate(10, ${yScale(d.value)})`);


    gButtons.selectAll('circle.palette-background')
      .data(d => [d])
      .join('circle')
      .classed('palette-background', true)
      .attr('cx', 2)
      .attr('cy', 6)
      .attr('r', SINGLE_FEATURE_HEIGHT * 0.35)
      .attr('fill', FTTemplate.SECONDARY_BACKGROUND_COLOR)
      .attr('stroke', d => d.color);

    gButtons.selectAll('path.infoButton')
      .data(d => [d])
      .join('path')
      .classed('infoButton', true)
      .attr('d', d => d.icon)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1);

    gButtons.filter(d1 => d1.value !== 'info')
      .transition()
      .duration(100)
      .attr('opacity', toggleInfo ? 1 : 0);

    gButtons
      .classed('cursor-manina', d => (!toggleInfo || d.value !== 'info'))
      .on('click', (d) => {
        const button = d3.select(d.target).datum();
        const gfButtons = gButtons.filter(d1 => d1.value !== 'info')
            .transition()
            .duration(100);

        if (button.value === 'close') {
          toggleInfo = false;
          gfButtons.attr('opacity', 0);
          console.log('false', gButtonsWrapper.selectAll('g.info'));
          gButtonsWrapper.selectAll('g.info')
            .classed('cursor-manina', true);
        }

        if (button.value === 'info') {
          toggleInfo = true;
          gfButtons.attr('opacity', 1);
          console.log('true', gButtonsWrapper.selectAll('g.info'));
          gButtonsWrapper.selectAll('g.info')
            .style('cursor', 'default');
        }

        dispatcher.call('tutorialButtonClick', null, button.value);
      });
  }

  return me;
}


function FIPERView() {
  // global width of the whole visualization
  let width = GLOBAL_WIDTH;
  // global height of the whole visualization
  let height = 500;
  // scale to position each feature row. HINT: maybe a d3.scaleBand() is better?
  const yScale = d3.scaleLinear();

  let fcrg = FIPERCRuleGrid();

  function me(selection) {
    const origDatum = selection.datum();
    // console.log('origDatum', origDatum);
    const oFeatures = selection.datum().features;
    // determine the maximum value of Feature Importance to fit the scale. We use absolute value
    // to ignore the sign of the feature importance
    const fiMax = d3.max(oFeatures, d => Math.abs(d.feature_importance));
    // create a scale to fit the feature importance values in absolute value
    const fiExtent = [0, fiMax];

    // prepare the features for visualization
    // given the order of the features, we scan all of them, to find that
    // feature that has the property status equal to 1. This feature will be
    // the selected one and will be displayes expanded.
    // The preceeding features will be displayed in a collapsed way and they
    // are marked with the property status equal to 0.
    // The following features will be displayed in a collapsed way and they
    // are marked with the property status equal to 2. For these features, we
    // need to calculate an offset to position them correctly. This offset is given
    // by the sum of the number of rows of the selected feature.


    const features = oFeatures.map((d) => {
      const f = {
        ...d,
      };

      const rule2text = predicate2text(d.rmatrix, d.values, 'R0', '');
      // Adding strings to be used for textual labels
      f.ruleText = Object.fromEntries(Object.entries(d.rulePredicateMap)
        .filter(([, v]) => v)
        .map(([k]) => [k, (rule2text)]),
      );
      f.cruleText = Object.fromEntries(Object.entries(d.cRulesRelevanceMap)
        .filter(([, v]) => v > 0)
        .map(([k], i) => [k, (
          predicate2text(d.crmatrix && d.crmatrix[i], d.values, k, '')
        )]),
      );

      return f;
    });

    // Component to handle the FI visualization for each feature
    const ffv = FIPERFeatureImportanceView()
      .width(FI_COLUMN_WIDTH)
      .height((SINGLE_FEATURE_HEIGHT * 3) / 6)
      .fitExtent(fiExtent);
    // Component to handle the distribution of the values of the descriptor of each feature
    const fdv = FIPERFeatureDistributionView()
      .width(RULES_COLUMN_WIDTH)
      .height((SINGLE_FEATURE_HEIGHT * 3) / 6)
      .color(FTTemplate.DISTRIBUTION_COLOR)
      .strokeColor(FTTemplate.DISTRIBUTION_STROKE_COLOR)
      .fFilterRule(() => true);
    // Component to visualize the layer for the rules
    const rpv = FIPERRulePredicateView()
      .width(RULES_COLUMN_WIDTH)
      .height(SINGLE_FEATURE_HEIGHT / 6)
      .subHeight(SINGLE_FEATURE_HEIGHT / 6)
      .color('url(#p_RULE_COLOR)') // .color(FTTemplate.RULE_COLOR) for solid color
      .strokeColor(FTTemplate.RULE_STROKE_COLOR)
      .isFactualRule(true);
    // Component to visualize the layer for the counter rules
    const crpv = FIPERRulePredicateView()
      .width(RULES_COLUMN_WIDTH)
      .height(SINGLE_FEATURE_HEIGHT / 6)
      .subHeight(SINGLE_FEATURE_HEIGHT / 6)
      .color('url(#p_CRULES_COLOR)') // .color(FTTemplate.CRULES_COLOR) for solid color
      .strokeColor(FTTemplate.CRULES_STROKE_COLOR)
      .isFactualRule(false)
      .selectedCounterRule(origDatum.selectedCounterRule);
    // Component to visualize the instance value for each row.
    const fivv = FIPERFeatureInstanceValueView()
      .width(RULES_COLUMN_WIDTH)
      .height((SINGLE_FEATURE_HEIGHT * 3) / 6);
    // Component to visualize the labels of the features at the beginning of each row
    const flv = FIPERFeatureLabelsView()
      .width(LABELS_COLUMN_WIDTH)
      .height(SINGLE_FEATURE_HEIGHT);
    // create variable width for the column of the counter rules
    const crWidth = origDatum.counterRules.length * CRULES_GRID_COLUMN_WIDTH;
    // component to visualize the grid of available counter rules
    fcrg = FIPERCRuleGrid()
      .width(crWidth)
      .height(SINGLE_FEATURE_HEIGHT)
      .cruleList(origDatum.counterRules)
      .selectedCounterRule(origDatum.selectedCounterRule);
    fdv.selectedCounterRule(origDatum.selectedCounterRule);


    // colorscale to be used to highlight the selected feature
    const highlightScale = d3.scaleOrdinal()
      .domain([0, 1])
      .range(['transparent', FTTemplate.SECONDARY_BACKGROUND_COLOR]);

    // const backgroundHeight = d3.scaleOrdinal()
    //   .domain([0, 1, 2])
    //   .range([SINGLE_FEATURE_HEIGHT, 5 * SINGLE_FEATURE_HEIGHT, SINGLE_FEATURE_HEIGHT]);
    yScale.domain([0, features.length])
      .range([0, features.length * (SINGLE_FEATURE_HEIGHT + VERTICAL_GUTTER)]);

    const t = d3.transition()
      .duration(500)
      .ease(d3.easeLinear)
      .on('end', () => {
        // console.log('Transition ended');
        setTimeout(() => {
          const bbox = selection.node().getBBox();
          selection.node().parentNode.setAttribute('height', bbox.height +
            ((2 * VERTICAL_GUTTER) + (MENU_HEIGHT + (2 * SINGLE_FEATURE_HEIGHT))));
          selection.node().parentNode.setAttribute('width', Math.max(
            cl.dimensions('feature-labels').width + cl.dimensions('feature-labels').x + (GUTTER),
            bbox.width + (2 * GUTTER)),
          );
        }, 300);
      });


    // create a group for each feature row
    const gFeatures = selection.selectAll('g.feature')
      .data(features, d => d.rname)
      .join('g')
      .classed('feature', true)
      .classed('cursor-expand', (d) => !d.status)
      .classed('cursor-close', (d) => d.status);

    cl.setWidth('crule-grid', crWidth);

    // for each feature row, we have 3 groups:
    // 1. the feature importance
    // 2. the distribution of the values
    // 3. the labels
    // We call separate components to handle each group. Each groups is located accordingly
    // to the size of the corresponsing COLUMN.
    let featureOffset = 0;
    gFeatures.each((_, j, n) => {
      // a rectangle to set the widht and height of the feature row.
      d3.select(n[j]).selectAll('rect.background')
        .data(d => [d])
        .join('rect')
        .classed('background', true)
        .attr('y', -6)
        .attr('width', width)
        .attr('height', SINGLE_FEATURE_HEIGHT)
        .transition(t)
        .attr('fill', d => highlightScale(d.status));


      const steps = origDatum.progressStatus;
      if (steps.findIndex(d1 => d1 === 'Feature Values') < 0) {
        d3.select(n[j]).selectAll('rect.background').remove();
      }
      // ==========    FEATURE LABELS    ==========
      const gLabels = d3.select(n[j]).selectAll('g.feature-labels')
        .data(d => [d])
        .join('g')
        .classed('feature-labels', true)
        .attr('transform', `translate(${cl.dimensions('feature-labels').x}, 0)`);
      gLabels.call(flv);
      if (steps.findIndex(d1 => d1 === 'Feature Values') < 0) {
        gLabels.remove();
      }

      // ==========    FEATURE VALUES    ==========
      const gValueStack = d3.select(n[j]).selectAll('g.feature-values')
        .data(d => [d])
        .join('g')
        .classed('feature-values', true)
        .attr('transform', `translate(${cl.dimensions('feature-values').x}, 0)`);
      const gTextualExplanation = gValueStack.selectAll('g.textual-explanation')
        .data(d => [d])
        .join('g')
        .classed('textual-explanation', true)
        .attr('transform', `translate(${VERTICAL_GUTTER}, ${0.5 * GUTTER})`);
      const gGraphicalExplanation = gValueStack.selectAll('g.graphical-explanation')
        .data(d => [d])
        .join('g')
        .classed('graphical-explanation', true);

      if (!origDatum.textVersion) {
        gGraphicalExplanation.selectAll('g.distribution')
          .data(d => [d])
          .join('g')
          .classed('distribution', true)
          .call(fdv);
        gGraphicalExplanation.selectAll('g.instance-value')
          .data(d => [d])
          .join('g')
          .classed('instance-value', true)
          .call(fivv);
        // The element g.rule is translated to the bottom part of the feature row
        // it is computed as 1 - 1/6 of the height of the feature row
        // thus it is 4/6
        gGraphicalExplanation.selectAll('g.rule')
          .data(d => [d])
          .join('g')
          .classed('rule', true)
          .attr('transform', `translate(0, ${(3 * SINGLE_FEATURE_HEIGHT) / 6})`)
          .call(rpv);
        // The element g.crules is translated to the bottom part of the feature row
        // below the element g.rule. Thus it is 4/6 + 1/6 = 5/6
        gGraphicalExplanation.selectAll('g.crules')
          .data(d => [d])
          .join('g')
          .classed('crules', true)
          .attr('transform', `translate(0, ${(3 * SINGLE_FEATURE_HEIGHT) / 6})`)
          .call(crpv);
        gTextualExplanation.remove();
      } else {
        // gTextualExplanation.selectAll('text.description')
        //   .data(d => [d])
        //   .join('text')
        //   .classed('description', true)
        //   .attr('x', 0)
        //   .attr('y', GUTTER / 2)
        //   .attr('font-size', FONT_SIZE)
        //   .attr('fill', FTTemplate.TEXT_COLOR)
        //   .html(d => d.ruleText.R0);
        const textualExplanation = FIPERTextualExplanationView();
        textualExplanation.selectedCounterRule(origDatum.selectedCounterRule);
        gTextualExplanation.call(textualExplanation);

        gGraphicalExplanation.remove();
      }
      // this remove the component if the step is not in the progressStatus
      if (steps.findIndex(d1 => d1 === 'Rules') < 0) {
        gValueStack.remove();
      }

      // ==========    COUNTER RULES GRID    ==========
      const gCruleGrid = d3.select(n[j]).selectAll('g.crule-grid')
        .data(d => [d])
        .join('g')
        .classed('crule-grid', true)
        .attr('transform', `translate(${cl.dimensions('crule-grid').x}, 0)`);
      gCruleGrid.call(fcrg);
      if (steps.findIndex(d1 => d1 === 'Counter Rules') < 0) {
        gCruleGrid.remove();
      }

      // ==========    FEATURE IMPORTANCE    ==========
      const gFeatureImportance = d3.select(n[j]).selectAll('g.feature-importance')
        .data(d => [d])
        .join('g')
        .classed('feature-importance', true)
        .attr('transform', `translate(${cl.dimensions('feature-importance').x}, 0)`)
        .attr('visibility', () => (steps.findIndex(d1 => d1 === 'Feature Importance') > 0 ? 'visible' : 'collapse'));
      gFeatureImportance.call(ffv);
      if (steps.findIndex(d1 => d1 === 'Feature Importance') < 0) {
        gFeatureImportance.remove();
      }


      const gFeatureHandler = d3.select(n[j]).selectAll('g.feature-handler')
        .data(d => [d])
        .join('g')
        .classed('feature-handler', true)
        .attr('transform', `translate(${cl.dimensions('feature-handler').x + 6 + 6}, 6)`);

      const igFeatureHandler = gFeatureHandler.selectAll('g.feature-handler-internal')
        .data(d => [d])
        .join('g')
        .classed('feature-handler-internal', true)
        .attr('transform', 'rotate(0)');

      igFeatureHandler.selectAll('path.feature-handler')
        .data(d => [d])
        .join('path')
        .classed('feature-handler', true)
        .attr('d', 'M3.6,-3l1.4,1.4-5,5-5-5,1.4-1.4,3.6,3.6,3.6-3.6')
        .attr('fill', FTTemplate.DISTRIBUTION_STROKE_COLOR);

      igFeatureHandler
        .filter(d => d.status === 1)
        .transition()
        .duration(200)
        .style('transition', 'transform 0.5s')
        .attr('transform', d => (d.status === 1 ? 'rotate(180)' : 'rotate(0)'));

      if (steps.findIndex(d1 => d1 === 'Rules') < 0) {
        gFeatureHandler.remove();
      }


      const gfBbox = n[j].getBBox();
      d3.select(n[j]).datum().bbox = gfBbox;
      d3.select(n[j]).datum().offset = featureOffset;
      featureOffset += gfBbox.height;

      if (d3.select(n[j]).datum().status === 1) {
        featureOffset += GUTTER;
      }
      d3.select(n[j])
        .transition(t)
        .attr('transform', d => `translate(0, ${d.offset})`);
      d3.select(n[j]).selectAll('rect.background')
        .attr('height', gfBbox.height + (0.5 * GUTTER));
      d3.select(n[j]).selectAll('rect.gutter')
        .attr('height', 1.5 * GUTTER)
        .attr('y', gfBbox.height - GUTTER);
      d3.select(n[j]).selectAll('line.gridLine')
        .attr('y2', gfBbox.height);
    });

    // eslint-disable-next-line func-names
    gFeatures.on('click', function () {
      const clickedFeature = d3.select(this).datum();
      gFeatures.data().forEach((d, i) => {
        if (d.rname === clickedFeature.rname) {
          // eslint-disable-next-line no-param-reassign
          selection.datum().features[i].status = (d.status === 1) ? 0 : 1;
        } else {
          // eslint-disable-next-line no-param-reassign
          selection.datum().features[i].status = 0;
        }
      });

      me(selection);
      const bbox = selection.node().getBBox();
      selection.node().parentNode.setAttribute('height', bbox.height +
        (GUTTER + (MENU_HEIGHT + (2 * SINGLE_FEATURE_HEIGHT))));
    });
  }

  // eslint-disable-next-line
  me.cRulesGridBandScale = function () {
    if (!arguments.length) return fcrg.bandScale();
    return me;
  };

  // eslint-disable-next-line
  me.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return me;
  };

  // eslint-disable-next-line
  me.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return me;
  };

  return me;
}

function computeBooleanExpectedValue(value) {
  // Given a dictionary like following, return an expected boolean value for it
  // {
  //     "att": "present_emp_since=.. >= 7 years",
  //     "op": "<=",
  //     "thr": 0.6689819991588593,
  //     "is_continuous": true,
  //     "exp_value": 15
  // }
  if (value.op === '<=') {
    return !(value.thr >= 0);
  }
  if (value.op === '<') {
    return !(value.thr > 0);
  }
  if (value.op === '>=') {
    return (value.thr <= 1);
  }
  if (value.op === '>') {
    return (value.thr < 1);
  }

  return false;
}

function adjustCounterRuleMatrix(matrix) {
  // For a feature we take the matrix of the form:
  // crmatrix:
  //   Array(4)
  //     0 : (5) [ [0,0], [0,0], [-1, undef], [-1, undef], [-1, undef]]
  //     1 : (5) [ [-1, undef], [0,0], [-1, undef], [-1, undef], [-1, undef] ]
  //     2 : (5) [ [-1, undef], [0,0], [-1, undef], [-1, undef], [-1, undef] ]
  //     3 : (5) [ [-1, undef], [0,0], [-1, undef], [-1, undef], [-1, undef] ]
  // and we adjust the values to have only 0 or 1 in the first compoent.
  //  The approach is the following:
  // 1. If the maximum value of one row is 0, then all the -1 are changed to 1
  // 2. If the maximum value of one row is 1, then all the -1 are changed to 0
  // 3. If the maximum value of one row is -1, then we do nothing

  return matrix.map((r) => {
    const max = d3.max(r, v => v.exp_value);
    const minV = d3.min(r, v => v.consequent_class);
    if (max === 0) {
      return r.map(d => (d.exp_value === -1 ? ({ exp_value: 1, conquent_class: minV }) : d));
    }
    if (max === 1) {
      return r.map(d => (d.exp_value === -1 ? ({ exp_value: 0, conquent_class: minV }) : d));
    }
    return r;
  });
}

function rewritePredicatesCategorical(c, e, ruleSelector) { // for each CounterRule,
  // for each value in the current Feature
  return e.values.map(v =>
    // check if the current CR id is present in the crules of the current value
    (v[ruleSelector] ? v[ruleSelector][c] : []),
  )
    // in case of categorical features, we have a list of possible predicates
    // of the form {exp_value: false, conquent_class: 0}
    .map(v => ((v) ? v[0] : ({ exp_value: -1, consequent_class: 27 })))
    // for those entries where there is an array, we take the expected value
    // of the first element
    // .map(v => [v[0].exp_value, v[1]])
    //  we convert the boolean values as 0 or 1. We leave -1 values as they are
    .map(d => ({
      // eslint-disable-next-line no-nested-ternary
      exp_value: d.exp_value === -1 ? -1 : (d.exp_value ? 1 : 0),
      consequent_class: d.consequent_class,
    }));
}

function resolveInterval(pred, min, max) {
  // this function receives a predicate and the minimum and maximum values of the feature.
  // The predicate has the following form: {att: 'att_name', op: '>', thr: 0.5}
  // The function returns the interval that the predicate represents.
  // we enforce that the interval is within the bounds of the feature

  if (pred.op === '>') {
    return [Math.max(pred.thr, min), max];
  }
  if (pred.op === '>=') {
    return [Math.max(pred.thr, min), max];
  }
  if (pred.op === '<') {
    return [min, Math.min(pred.thr, max)];
  }
  if (pred.op === '<=') {
    return [min, Math.min(pred.thr, max)];
  }
  return [min, max];
}

function intervalUnion(intervals) {
  // this function receives a list of intervals and returns the union of all the intervals.
  // Each interval has the form {consequent_class: 0, interval: [0.5, 1]}
  if (intervals.length === 0) {
    return [];
  }
  intervals.sort((a, b) => a.interval[0] - b.interval[0]);
  const union = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i].interval[0] <= current.interval[1]) {
      current.interval[1] = Math.min(current.interval[1], intervals[i].interval[1]);
    } else {
      union.push(current);
      current = intervals[i];
    }
  }

  union.push(current);
  return union;
}

function intervalIntersection(intervals) {
  // this function receives a list of intervals and returns the intersection of all the intervals.
  // Each interval has the form {consequent_class: 0, interval: [0.5, 1]}
  if (intervals.length < 2) {
    return [];
  }

  intervals.sort((a, b) => a.interval[0] - b.interval[0]);
  const intersection = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i].interval[0] <= current.interval[1]) {
      current.interval[0] = Math.max(current.interval[0], intervals[i].interval[0]);
      current.interval[1] = Math.min(current.interval[1], intervals[i].interval[1]);
    } else {
      intersection.push(current);
      current = intervals[i];
    }
  }

  intersection.push(current);
  return intersection;
}

function reduceUnionIntersection(predicatesWithIntervals) {
  // this function receives a list of predicates with intervals and returns the intersection
  // of all the intervals.
  // Each predicate has the form {att: 'att_name', op: '>', thr: 0.5, interval: [0.5, 1]}
  if (predicatesWithIntervals.length === 0) {
    return [];
  }

  let result = intervalIntersection(predicatesWithIntervals);
  if (result.length === 0) {
    result = intervalUnion(predicatesWithIntervals);
  }

  return result;
}

function preprocessData(data) {
  // preprocess each entry to copmute the expected value for the categorical counterrules
  // console.log('data', data);
  const tfeature = data.features
    // .filter(f => f.type === 'categorical')
    // .filter(f => Object.entries(f.crules).length)
    .map((f) => {
      if (f.type === 'categorical') {
        return {
          ...f,
          // transform the original crules into a dictionary where each entry is extended
          // with the expected value of the rule
          crules: Object.fromEntries(
            Object.keys(f.crules)
              .map(k => [k,
                f.crules[k].map(p =>
                  ({
                    exp_value: computeBooleanExpectedValue(p[0]),
                    consequent_class: p[1],
                  }),
                )])),
          rules: Object.fromEntries(
            ['R0'].map(k => [k,
              f.rule.map(p =>
                ({
                  exp_value: computeBooleanExpectedValue(p[0]),
                  consequent_class: p[1],
                }),
              )],
            ).filter(v => v[1].length > 0),
          ),
        };
      }
      return f;
    });
  // console.log('tfeature', tfeature);

  // all values of a single features are grouped by the name of the feature
  const rFeatures = d3.group(tfeature, d => d.rname);
  // after the aggregation, we create a list of objects with the properties of the feature
  const rEntries = Array.from(rFeatures.entries())
    .map(d => ({
      rname: d[0],
      values: d[1].map(v => ({ ...v, rvalues: [], crvalues: [] })),
      feature_importance: d3.sum(d[1], f => f.feature_importance),
      type: d[1][0].type,
      status: 0, // flag to indicate the status of the feature. 0: normal, 1: selected
      rows: d[1].length, // how many distinct values the feature has
      // rvalues: [], // to be removed
      // crvalues: [], // to be removed
    }));
  // since each value as references to a rule or counterrules, we select only those values
  // that have a rule, i.e. the corresponding v.rule array is not empty and the value is the
  // instance value
  // console.log('rEntries', rEntries);

  // this list contains the set of all the counterRules that are present in the explanation
  // object. This is used to create the legend and selectors of the visualization
  const CRulesList = Array.from(new Set(rEntries
    .map(e => e.values.map(v =>
      (v.crules ? Object.entries(v.crules).map(r => r[0]) : []))).flat().flat()));

  // console.log('CRulesList', CRulesList);
  // first manage the counter rules for categorical features
  // =============================================================
  //            CATEGORICAL FEATURES
  // =============================================================
  const cEntries = rEntries.filter(e => e.type === 'categorical').map(e => ({
    ...e,
    crmatrix: adjustCounterRuleMatrix(CRulesList.map(c => rewritePredicatesCategorical(c, e, 'crules'))),
    rmatrix: adjustCounterRuleMatrix(['R0'].map(c => rewritePredicatesCategorical(c, e, 'rules'))),
  })).map(e => ({
    ...e,
    values: e.values.map((v, i) => ({
      ...v,
      // we add the bitmap to decide if this value is visible for a specific counter rule.
      predicates: Object.fromEntries(
        CRulesList.map((_, j) => [_, e.crmatrix[j][i]])
          .concat([['R0', e.rmatrix[0][i]]])
          .filter(vv => vv[1].exp_value >= 0),
      ),
    }))
      .map(v => ({
        eda: v.eda,
        feature_importance: v.feature_importance,
        instance_value: v.instance_value,
        name: v.name,
        rname: v.rname,
        type: v.type,
        predicates: v.predicates,
        parent: e,
      })),
  })).map(e => ({
    ...e,
    cRulesRelevanceMap: Object.fromEntries(CRulesList.map((c, i) => {
      // check if exp_values of crmatrix are all -1;
      if (e.crmatrix[i].map(v => v.exp_value).reduce((acc, curr) => acc && curr === -1, true)) {
        return [c, 0];
      }
      // check if th exp_values of crmatrix are equal to the exp_values of rmatrix
      if (e.crmatrix[i].map((v, j) => v.exp_value === e.rmatrix[0][j].exp_value)
        .reduce((acc, curr) => acc && curr, true)) {
        return [c, 1];
      }
      return [c, 2];
    })),
    rulePredicateMap: Object.fromEntries(['R0'].map(c => [c, (
      e.values.map((v) => {
        if (c in v.predicates) {
          return v.predicates[c].exp_value > 0;
        }
        return false;
      }).reduce((acc, curr) => acc || curr, false)
    )])),
  }));

  // then manage the counter rules for numerical features
  // =============================================================
  //            NUMERICAL FEATURES
  // =============================================================
  const nEntries = rEntries.filter(e => e.type === 'numeric')
    // transform each predicate into a dictionary with the consequent class
    .map(e => ({
      ...e,
      values: e.values.map(v => ({
        ...v,
        rule: v.rule.map(r => ({
          attr: r[0].att,
          op: r[0].op,
          thr: r[0].thr,
          consequent_class: r[1],
        })),
        predicates: Object.fromEntries(
          CRulesList.map(c => [c, v.crules[c] ? v.crules[c].map(r => ({
            attr: r[0].att,
            op: r[0].op,
            thr: r[0].thr,
            consequent_class: r[1],
          })) : []])
            .concat([['R0', v.rule.map(r => ({
              attr: r[0].att,
              op: r[0].op,
              thr: r[0].thr,
              consequent_class: r[1],
            }))]])
            .map(pr => [pr[0], pr[1].map(pl => ({
              ...pl,
              // find the actual interval of the predicate
              interval: resolveInterval(pl, v.eda.min, v.eda.max),
            }))])
            .map(pr => [pr[0], reduceUnionIntersection(pr[1])]),
        ),
      })),
    })).map(e => ({
      ...e,
      cRulesRelevanceMap: Object.fromEntries(CRulesList.map((c) => {
        // check if the counter rule is relevant
        const currValue = e.values[0];
        // check if predicates of the counter is present
        if (c in currValue.predicates && currValue.predicates[c].length > 0) {
          // check if the interval of the counter rule is different from the interval of the rule
          const instanceValue = currValue.instance_value;
          const cruleInterval = currValue.predicates[c][0].interval;
          // check if instance value is within the interval of the counter rule
          if (instanceValue >= cruleInterval[0] && instanceValue <= cruleInterval[1]) {
            return [c, 1];
          }
          return [c, 2];
        }
        return [c, 0];
      })),
      rulePredicateMap: Object.fromEntries(['R0'].map(c => [c, (
        e.values.map((v) => {
          if (c in v.predicates) {
            return v.predicates[c].length > 0;
          }
          return false;
        }).reduce((acc, curr) => acc || curr, false)
      )])),
    }));


  // concatenate cEntries and nEntries into a single array
  const aEntries = cEntries.concat(nEntries);
  // sort the entries by feature importance
  // aEntries.sort((a, b) => (b.feature_importance) - (a.feature_importance));

  // sort the entries by rules and counter rules first
  aEntries.sort((a, b) => {
    const aRules = Object.values(a.rulePredicateMap).filter(v => v).length;
    const bRules = Object.values(b.rulePredicateMap).filter(v => v).length;
    if (aRules === bRules) {
      const aCRules = Object.values(a.cRulesRelevanceMap).filter(v => v > 0).length;
      const bCRules = Object.values(b.cRulesRelevanceMap).filter(v => v > 0).length;
      return bCRules - aCRules;
    }
    return bRules - aRules;
  });

  const explanationDescriptor = {
    features: aEntries,
    counterRules: CRulesList,
    predicted_class: data.predicted_class,
    predicted_proba: data.predicted_proba,
    selectedCounterRule: 'C0',
    filterRules: false,
    filterCRules: false,
    filterNoRules: false,
    textVersion: false,
    progressStatus: ['Classification', 'Feature Values', 'Rules', 'Counter Rules', 'Feature Importance'], // is one of ['Classification', 'Feature Values', 'Rules', 'Counter Rules', 'Feature Importance']
  };
  return explanationDescriptor;
}

function FiperTutorial() {
  let width = 200;
  let height = 200;
  let top = 0;
  let left = 0;
  let currentStep = -1; // -1 means that the boxes are not visible,
  // 0 means that only the first box is visible,
  // 1 means that the first and the second box are visible, and so on.

  let zones = [
    {
      label: 'Label of the zone',
      name: 'example_zone',
      x: 0,
      y: 0,
      width: 300, // use -1 to expand to the whole visible horizontal space
      height: MENU_HEIGHT, // use -1 to expand to the whole visible vertical space
      description: 'This is a plain text description of the content highlighted by the zone.',
    },
  ];

  // This tooltip will contain the description of the active tutorial box
  // it is created once when the Tutorial instance is created and then updated
  // with the content of the active box
  const tooltip = d3.select('body')
    .selectAll('div.d3-tutorial-tooltip.tutorial')
    .data([1])
    .join('div')
    .classed('d3-tutorial-tooltip', true)
    .classed('tutorial', true)
    .style('opacity', 0);


  function rect2path(x, y, w, h) {
    return `M-10,-100 h${width+200}v${height+top+200}h${-width-200}v${-height-top-200}Z M${x},${y}v${h}h${w}v${-h}h${-w}Z`;
  }

  function me(selection) {
    const selectedZones = currentStep >= 0 ? zones.slice(currentStep, currentStep + 1) : [];
    const gZones = selection.selectAll('g.zone')
      .data(selectedZones)
      .join('g')
      .classed('zone', true);

    // we have a single zone selected
    if (selectedZones.length === 1) {
      const activeZone = selectedZones[0];
      const ax = activeZone.x < 0 ? width + activeZone.x : activeZone.x;
      const ay = activeZone.y;
      tooltip.style('opacity', 0.9);
      tooltip.html(`<strong>${activeZone.label}</strong><br>${activeZone.description}`)
        .transition()
        .duration(200)
        .style('left', `${ax + left + activeZone.dx}px`)
        .style('top', `${ay + top + activeZone.dy}px`);
    } else {
      tooltip.transition()
        .duration(200)
        .style('opacity', 0);
    }

    gZones.selectAll('path.zone')
      .data(d => [d])
      .join('path')
      .classed('zone', true)
      .attr('fill', FTTemplate.CRULES_COLOR)
      .attr('fill-opacity', 0.5)
      .attr('stroke', FTTemplate.CRULES_COLOR)
      .attr('stroke-width', 1)
      .transition()
      .duration(200)
      .attr('d', d => rect2path(
        d.x < 0 ? width + d.x : d.x,
        d.y,
        (d.width < 0 ? width + d.width  : d.width),
        (d.height < 0 ? height + d.height  : d.height),
      ))
    ;
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

    // eslint-disable-next-line func-names
  me.top = function (_) {
    if (!arguments.length) return top;
    top = _;

    return me;
  };

  me.left = function(_) {
    if (!arguments.length) return left;
    left = _;

    return me;
  }

  // eslint-disable-next-line func-names
  me.currentStep = function (_) {
    if (!arguments.length) return currentStep;
    currentStep = _;

    return me;
  };

  // eslint-disable-next-line func-names
  me.forwardStep = function () {
    if (!zones.length) {
      return me;
    }
    if (currentStep >= zones.length - 1) {
      currentStep = 0;
    } else {
      currentStep += 1;
    }
    return me;
  };

  // eslint-disable-next-line func-names
  me.backwardStep = function () {
    if (!zones.length) {
      return me;
    }
    if (currentStep <= 0) {
      currentStep = zones.length - 1;
    } else {
      currentStep -= 1;
    }
    return me;
  };

  // eslint-disable-next-line func-names
  me.zones = function (_) {
    if (!arguments.length) return zones;
    zones = _;

    return me;
  };

  return me;
}

function FiperDefs(){
  const spacing = 2;
  const thickness = 3;
  const rotation = 45;

  function me(selection){
    const defs = selection.selectAll('defs')
      .data([1]) // Usa un array con un singolo elemento come dati
      .join('defs');

    const patterns = defs.selectAll('pattern')
      .data(Object.keys(FTTemplate))
      .join('pattern')
      .attr('id', d => `p_${d}`)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', spacing + (thickness / 2))
      .attr('height', spacing + (thickness / 2))
      .attr('patternTransform', d=> (d === 'CRULES_COLOR' ? `rotate(${rotation})` : `rotate(${-rotation})`));

    patterns.selectAll('line')
      .data(d => [d])
      .join('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', spacing + (thickness / 2))
      .attr('stroke', d => FTTemplate[d])
      .attr('stroke-width', thickness);
  }

  return me;

}


function InstanceView() {
  function me(selection) {
    const explanationDescriptor = selection.datum();
    const fv = FIPERView().width(GLOBAL_WIDTH +
    (explanationDescriptor.counterRules.length * CRULES_GRID_COLUMN_WIDTH));
    const fm = FiperMenu();
    const ftb = FiperMenuTutorial();
    const fdefs = FiperDefs();

    // ==================== TUTORIAL COMPONENT ====================
    const ft = FiperTutorial();

    const mainSvg = selection.selectAll('svg.viz')
      .data([0]) // Usa un array con un singolo elemento come dati
      .join('svg')
      .classed('viz', true)
      // .attr('width', 300)
      // .attr('height', 200)
      .attr('style', `background-color: ${FTTemplate.BACKGROUND_COLOR};`);

    const svg = mainSvg.selectAll('g.main')
      .data([0]) // Usa un array con un singolo elemento come dati
      .join('g')
      .classed('main', true)
      .attr('id', 'main')
      .attr('transform', `translate(0, ${6 + MENU_HEIGHT + (2 * SINGLE_FEATURE_HEIGHT)})`)
  ;

    const menuSvg = mainSvg.selectAll('g.menu')
      .data([0]) // Usa un array con un singolo elemento come dati
      .join('g')
      .classed('menu', true)
      .attr('id', 'menu')
      // .attr('width', 300)
      .attr('height', MENU_HEIGHT + (2 * SINGLE_FEATURE_HEIGHT)) // added height of the menu + chart title here, check if it is correct
      .attr('style', `background-color: ${FTTemplate.BACKGROUND_COLOR};`);


    const gInfoTutorial = mainSvg.selectAll('g.infoTutorial')
      .data(d => [d])
      .join('g')
      .classed('infoTutorial', true)
      ;

    const gPaletteTutorial = mainSvg.selectAll('g.paletteTutorial')
      .data(d => [d])
      .join('g')
      .classed('paletteTutorial', true)
      .attr('transform', `translate(${GUTTER}, ${GUTTER})`)
      ;








    function refreshVisualization(descriptor) {
      const filterFunctionRule = f => d3.sum(Object.values(f.rulePredicateMap)) > 0;
      const filterFunctionCRule = f => d3.sum(Object.values(f.cRulesRelevanceMap)) > 0;
      // const filterFunctionNoRules = f => (d3.sum(Object.values(f.rulePredicateMap)) +
      //   d3.sum(Object.values(f.cRulesRelevanceMap))) === 0;

      // Accumulate all active filters and apply them in OR
      // a feature is shown if it matches ANY of the active filters.
      const activeFilters = [];
      if (descriptor.filterRules) activeFilters.push(filterFunctionRule);
      if (descriptor.filterCRules) activeFilters.push(filterFunctionCRule);
      // if (descriptor.filterNoRules) activeFilters.push(filterFunctionNoRules);

      let currentFilter = activeFilters.length === 0
        ? () => true
        : f => activeFilters.some(fn => fn(f));

      const filteredDescriptor = {
        ...explanationDescriptor,
        features: explanationDescriptor.features.filter(currentFilter),
      };
      svg.datum(filteredDescriptor).call(fv);
      svg.call(fdefs);
      menuSvg.datum(filteredDescriptor).call(fm);
      gInfoTutorial.call(ft);
      gPaletteTutorial.call(ftb);
    }

    // it is important that fm component is called after fv has been called the first time
    // to ensure that the bandScale is correctly initialized
    refreshVisualization(explanationDescriptor);

    // compute the resulting bounding box to set the height of the svg
    // recall: `svg` variable is the group `g` that contains the visualization
    //        so we refer to the parent node to set the height correctly
    const bbox = svg.node().getBBox();
    mainSvg.node().parentNode.setAttribute('height', bbox.height +
    (GUTTER + (MENU_HEIGHT + (2 * SINGLE_FEATURE_HEIGHT))));
    mainSvg.node().parentNode.setAttribute('width', bbox.width + GUTTER);
    const totalWidth = bbox.width + GUTTER;
    fv.width(totalWidth);
    ft.width(totalWidth);
    ft.height(bbox.height + (150 * Math.random()));

    // zones are defined here so that totalWidth is available
    const zones = [
      {
        label: 'Menu',
        name: 'menu_zone',
        x: cl.dimensions('feature-labels').x - (GUTTER * 0.25),
        y: GUTTER * 0.5,
        width: -(cl.dimensions('feature-labels').x - (GUTTER * 0.25)), // use -1 to expand to the whole visible horizontal space
        height: MENU_HEIGHT, // use -1 to expand to the whole visible vertical space
        description: 'From this section you can control the properties of the visualization. You can change the level' +
          'of details, the sorting criteria of the features, and the selection of specific counter rules.',
        // the position of the description with respect to zone positioning
        dx: 0,
        dy: MENU_HEIGHT  + (0.5 * GUTTER),
      },
      {
        label: 'Explanation',
        name: 'explanation_zone',
        x: GUTTER * 0.5,
        y: MENU_HEIGHT + GUTTER, // position it below the menu and the title of the chart
        width: -(GUTTER * 0.5), // use -1 to expand to the whole visible horizontal space
        height: -(GUTTER * 0.5), // use -1 to expand to the whole visible vertical space
        description: 'This is the area, where you can see the value of each feature and its distribution. ' +
        'You can also click on a feature to expand it and see more details.',
        // the position of the description with respect to zone positioning
        dx: GUTTER * 4,
        dy: -MENU_HEIGHT,
      },
      {
        label: 'Classification',
        name: 'classification_zone',
        x: cl.dimensions('feature-labels').x - (GUTTER * 0.5),
        y: SINGLE_FEATURE_HEIGHT + (GUTTER * 0.5),
        width: (cl.dimensions('feature-labels').width) + GUTTER, // use -1 to expand to the whole visible horizontal space
        height: MENU_HEIGHT - (2 * SINGLE_FEATURE_HEIGHT) + GUTTER, // negative value for vertical expansion
        description: 'This is the classification area, where you can see the predicted class of the current instance. ' +
          'On the bottom, the bar chart shows the probabilities of each class',
        // the position of the description with respect to zone positioning
        dx: 0,
        dy: MENU_HEIGHT - 2 * SINGLE_FEATURE_HEIGHT + (GUTTER * 1.5),
      },
      {
        label: 'Progressive Bar',
        name: 'progressive_bar_zone',
        x: cl.dimensions('feature-labels').x - (GUTTER * 0.5),
        y: GUTTER * 0.5,
        width: (cl.dimensions('feature-labels').width) + GUTTER, // use -1 to expand to the whole visible horizontal space
        height: SINGLE_FEATURE_HEIGHT + (GUTTER * 0.5), // use -1 to expand to the whole visible vertical space
        description: 'From this bar you can select one of the steps for exploring the explanations.',
        // the position of the description with respect to zone positioning
        dx: 0,
        dy: SINGLE_FEATURE_HEIGHT + GUTTER,
      },
      {
        label: 'Explanation modality',
        name: 'explanation_modality_zone',
        x: cl.dimensions('feature-values').x - (GUTTER * 0.25),
        y: GUTTER * 0.5,
        width: (cl.dimensions('feature-values').width)
          + (0.5 * GUTTER), // use -1 to expand to the whole visible horizontal space
        height: SINGLE_FEATURE_HEIGHT + (GUTTER * 0.5), // use -1 to expand to the whole visible vertical space
        description: 'Here you can select the textual or graphical version ' +
          'of the explanation.',
        // the position of the description with respect to zone positioning
        dx: 0,
        dy: SINGLE_FEATURE_HEIGHT + GUTTER,
      },
      {
        label: 'Ordering',
        name: 'ordering_zone',
        x: cl.dimensions('feature-values').x - (GUTTER * 0.25),
        y: SINGLE_FEATURE_HEIGHT + GUTTER,
        width: (cl.dimensions('feature-values').width) + (0.5 * GUTTER), // use -1 to expand to the whole visible horizontal space
        height: MENU_HEIGHT - (2 * SINGLE_FEATURE_HEIGHT), // negative value for vertical expansion
        description: 'Here you can select the order of the features based on feature importance,  ' +
          'feature name, or the presence of rules or counter rules.',
        // the position of the description with respect to zone positioning
        dx: 0,
        dy: 3 * SINGLE_FEATURE_HEIGHT + (GUTTER * 0.5),
      },
      {
        label: 'Filtering',
        name: 'filtering_zone',
        x: cl.dimensions('feature-labels').x - (GUTTER * 0.5),
        y: (4 * SINGLE_FEATURE_HEIGHT) + GUTTER,
        width: (cl.dimensions('feature-labels').width) + (0.5 * GUTTER), // use -1 to expand to the whole visible horizontal space
        height: SINGLE_FEATURE_HEIGHT - (GUTTER * 0.5), // negative value for vertical expansion
        description: 'This is the filtering selector, where you can filter the features based on the presence of rules ' +
          'or counterfactual rules.',
        // the position of the description with respect to zone positioning
        dx: 0,
        dy: SINGLE_FEATURE_HEIGHT ,
      },
      {
        label: 'Counter Rules Selector',
        name: 'counter_rules_selector_zone',
        x: cl.dimensions('crule-grid').x - (GUTTER * 0.25),
        y: SINGLE_FEATURE_HEIGHT + GUTTER,
        width: -(cl.dimensions('feature-importance').width + cl.dimensions('crule-grid').x
          + (GUTTER * 2)), // use -1 to expand to the whole visible horizontal space
        height: MENU_HEIGHT - (2 * SINGLE_FEATURE_HEIGHT), // negative value for vertical expansion
        description: 'This is the counter rules selector, where you can select one of the counterfactual rules to be ' +
          'highlighted in the visualization.',
        // the position of the description with respect to zone positioning
        dx: 0,
        dy: 3 * SINGLE_FEATURE_HEIGHT + (0.5 * GUTTER),
      },
      {
        label: 'Feature values',
        name: 'feature_values_zone',
        x: cl.dimensions('feature-labels').x - (GUTTER * 0.25),
        y: MENU_HEIGHT + GUTTER,
        width: (cl.dimensions('feature-labels').width) + (0.5 * GUTTER), // use -1 to expand to the whole visible horizontal space
        height: -0.5 * GUTTER, // use -1 to expand to the whole visible vertical space
        description: 'Here you find the list of features with their values for the current instance. You can click on a feature to expand it and see more details.',
        // the position of the description with respect to zone positioning
        dx: cl.dimensions('feature-labels').width + 10,
        dy: 0,
      },
      {
        label: 'Feature Distribution',
        name: 'feature_distribution_zone',
        x: cl.dimensions('feature-values').x - (GUTTER * 0.25),
        y: MENU_HEIGHT + GUTTER,
        width: (cl.dimensions('feature-values').width) + (0.5 * GUTTER), // use -1 to expand to the whole visible horizontal space
        height: -0.5 * GUTTER, // use -1 to expand to the whole visible vertical space
        description: 'Here you can see the distribution of the feature values.' +
          'The visualization depends on the type of data. For <b>categorical features</b>, the distribution is ' +
          'represented as a stacked bar chart, where each bar represents the frequency of a specific value. ' +
          'For <b>numerical features</b>, the distribution is represented as a line plot, where the x-axis represents ' +
          'the feature values and the y-axis represents the probability density of the feature values. The bottom ' +
          'part of each plot highlights the value range where the rules or counter rules are satisfied.',
        // the position of the description with respect to zone positioning
        dx: - 220,
        dy: 0,
      },
      {
        label: 'Counter Rules features',
        name: 'counter_rules_features_zone',
        x: cl.dimensions('crule-grid').x - (GUTTER * 0.25),
        y: MENU_HEIGHT + GUTTER,
        width: -(cl.dimensions('feature-importance').width + cl.dimensions('crule-grid').x + (GUTTER * 2)), // use -1 to expand to the whole visible horizontal space
        height: -0.5 * GUTTER, // use -1 to expand to the whole visible vertical space
        description: 'This is the counter rules features zone, where you can see the features that are involved in ' +
          'the counterfactual rules.<br/>A bullet matches the feature with the corresponding counter rule.<br/>A larger bullet ' +
          'means that the feature values <b>should</b> be changed to satisfy the counterfactual rule, while a smaller bullet means ' +
          'that the feature values <b>should not</b> be changed to satisfy the counterfactual rule.',
        // the position of the description with respect to zone positioning
        dx: - 220,
        dy: 0,
      },
      {
        label: 'Feature Importance',
        name: 'feature_importance_zone',
        x: -cl.dimensions('feature-importance').width - (2 * GUTTER),
        y: MENU_HEIGHT + GUTTER,
        width: (cl.dimensions('feature-importance').width) +  GUTTER, // use -1 to expand to the whole visible horizontal space
        height: -0.5 * GUTTER, // use -1 to expand to the whole visible vertical space
        description: 'For each feature, the horizontal bar represent the relevance of the attribute for the classification of the instance.',
        // the position of the description with respect to zone positioning
        dx: -220,
        dy: 0,
      },
    ];
    ft.zones(zones);
    // menuSvg.node().setAttribute('width', bbox.width + GUTTER);


    dispatcher.on('changeCounterRule', (d) => {
      explanationDescriptor.selectedCounterRule = d;
      refreshVisualization(explanationDescriptor);
    });

    dispatcher.on('changeOrder', (d) => {
      if (d === 'Feature Importance') {
        explanationDescriptor.features.sort((a, b) =>
          (b.feature_importance) - (a.feature_importance));
      }
      if (d === 'Counter Rules first') {
        explanationDescriptor.features
          .sort((a, b) =>
            ((Object.values(b.cRulesRelevanceMap).filter(v => v === 1).length) -
            (Object.values(a.cRulesRelevanceMap).filter(v => v === 1).length)))
          .sort((a, b) =>
            ((Object.values(b.cRulesRelevanceMap).filter(v => v === 2).length) -
            (Object.values(a.cRulesRelevanceMap).filter(v => v === 2).length)));
      }
      if (d === 'Rules first') {
        explanationDescriptor.features.sort((a, b) =>
          (d3.sum(Object.values(b.rulePredicateMap)) - d3.sum(Object.values(a.rulePredicateMap))));
      }
      if (d === 'Alphabetical') {
        explanationDescriptor.features.sort((a, b) =>
          a.rname.localeCompare(b.rname));
      }
      refreshVisualization(explanationDescriptor);
    });
    dispatcher.on('changeFilter', (d) => {
      explanationDescriptor.filterRules = d.Rules ? d.Rules.value : false;
      explanationDescriptor.filterCRules = d.CRules ? d.CRules.value : false;
      explanationDescriptor.filterNoRules = d.noRules ? d.noRules.value : false;
      refreshVisualization(explanationDescriptor);
    });

    dispatcher.on('changeTextualFormat', (d) => {
      explanationDescriptor.textVersion = d.Textual;
      refreshVisualization(explanationDescriptor);
    });

    dispatcher.on('changePalette', (d) => {
      FTTemplate = colorSet[d.value];

      mainSvg
        .attr('style', `background-color: ${FTTemplate.BACKGROUND_COLOR};`);
      refreshVisualization(explanationDescriptor);
    });

    dispatcher.on('changeProgressStep', (d) => {
      explanationDescriptor.progressStatus = d;
      refreshVisualization(explanationDescriptor);
    });

    dispatcher.on('tutorialButtonClick', (d) => {
      const currentStep = ft.currentStep();
      if ((d === 'info') && (currentStep === -1)) {
        explanationDescriptor.progressStatus = ['Classification', 'Feature Values', 'Rules', 'Counter Rules', 'Feature Importance'];
        ft.currentStep(0);
      }
      if (d === 'close') {
        ft.currentStep(-1);
      }

      if (d === 'next') {
        ft.forwardStep();
      }
      if (d === 'previous') {
        ft.backwardStep();
      }

      const bboxl = svg.node().getBBox();
      // to correctly position the description of the zones, compute top offset of the svg element
      const bboxParent = svg.node().parentNode.getBoundingClientRect();
      const absoluteTop = bboxParent.top + window.scrollY;
      const absoluteLeft = bboxParent.left + window.scrollX;
      ft.height(bboxl.height + (2 * SINGLE_FEATURE_HEIGHT));
      ft.top(absoluteTop);
      ft.left(absoluteLeft);
      refreshVisualization(explanationDescriptor);
    });
  }

  return me;
}

export {
  InstanceView,
  preprocessData,
};
