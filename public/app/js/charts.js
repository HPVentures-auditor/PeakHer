/**
 * PeakHer Charts
 * Chart.js wrappers for timeline, day-of-week, and week-ahead visualizations.
 * Requires Chart.js 4.x + chartjs-plugin-annotation loaded from CDN.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Charts = (function () {
  'use strict';

  // ── Chart.js global defaults ──────────────────────────────────────

  if (window.Chart) {
    Chart.defaults.color = 'rgba(255,255,255,0.7)';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
    Chart.defaults.font.family = 'Inter, sans-serif';
  }

  // ── Colors ────────────────────────────────────────────────────────

  var TEAL  = '#2D8A8A';
  var CORAL = '#E87461';

  var PHASE_BANDS = {
    Menstrual:  'rgba(123,167,194,0.08)',
    Follicular: 'rgba(94,196,154,0.08)',
    Ovulatory:  'rgba(232,116,97,0.08)',
    Luteal:     'rgba(196,154,94,0.08)'
  };

  // ── Instance management ───────────────────────────────────────────

  var chartInstances = {};

  function getOrCreateChart(canvasId, config) {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
    }
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    chartInstances[canvasId] = new Chart(ctx, config);
    return chartInstances[canvasId];
  }

  // ── Dark-theme base options ───────────────────────────────────────

  function darkScaleOptions(yMin, yMax) {
    return {
      x: {
        ticks: { color: 'rgba(255,255,255,0.5)', maxRotation: 45 },
        grid:  { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
        min: yMin !== undefined ? yMin : 0,
        max: yMax !== undefined ? yMax : 10,
        ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 2 },
        grid:  { color: 'rgba(255,255,255,0.05)' }
      }
    };
  }

  // ── Cycle phase annotations ───────────────────────────────────────

  function buildPhaseAnnotations(checkins, cycleProfile) {
    if (!cycleProfile || !cycleProfile.trackingEnabled) return {};
    if (!checkins || checkins.length === 0) return {};

    var Cycle = window.PeakHer.Cycle;
    var Utils = window.PeakHer.Utils;
    var annotations = {};
    var prevPhase = null;
    var bandStart = null;
    var bandIndex = 0;

    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      var cycleDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodDate,
        cycleProfile.cycleLength,
        c.date
      );
      var phase = cycleDay
        ? Cycle.getPhase(cycleDay, cycleProfile.cycleLength)
        : null;

      if (phase) {
        // Capitalize for PHASE_BANDS lookup
        var phaseKey = phase.charAt(0).toUpperCase() + phase.slice(1);

        if (phaseKey !== prevPhase) {
          // Close previous band
          if (prevPhase && bandStart !== null) {
            annotations['band' + bandIndex] = {
              type: 'box',
              xMin: bandStart,
              xMax: i - 1,
              backgroundColor: PHASE_BANDS[prevPhase] || 'transparent',
              borderWidth: 0
            };
            bandIndex++;
          }
          bandStart = i;
          prevPhase = phaseKey;
        }
      }
    }

    // Close last open band
    if (prevPhase && bandStart !== null) {
      annotations['band' + bandIndex] = {
        type: 'box',
        xMin: bandStart,
        xMax: checkins.length - 1,
        backgroundColor: PHASE_BANDS[prevPhase] || 'transparent',
        borderWidth: 0
      };
    }

    return annotations;
  }

  // ── renderTimeline ────────────────────────────────────────────────

  function renderTimeline(canvasId, checkins, cycleProfile) {
    if (!checkins || checkins.length === 0) return null;

    var Utils = window.PeakHer.Utils;

    var labels = checkins.map(function (c) {
      var d = Utils.parseDate(c.date);
      return d ? Utils.formatDateShort(d) : c.date;
    });

    var energies    = checkins.map(function (c) { return c.energy; });
    var confidences = checkins.map(function (c) { return c.confidence; });

    var annotations = buildPhaseAnnotations(checkins, cycleProfile);

    var config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Energy',
            data: energies,
            borderColor: TEAL,
            backgroundColor: TEAL,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2,
            fill: false
          },
          {
            label: 'Confidence',
            data: confidences,
            borderColor: CORAL,
            backgroundColor: CORAL,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: 'rgba(255,255,255,0.7)', usePointStyle: true, padding: 16 }
          },
          tooltip: {
            callbacks: {
              title: function (items) {
                if (!items.length) return '';
                var idx = items[0].dataIndex;
                var c = checkins[idx];
                var d = Utils.parseDate(c.date);
                return d ? Utils.formatDate(d) : c.date;
              },
              label: function (item) {
                return item.dataset.label + ': ' + item.formattedValue;
              }
            }
          },
          annotation: {
            annotations: annotations
          }
        },
        scales: darkScaleOptions(1, 10)
      }
    };

    return getOrCreateChart(canvasId, config);
  }

  // ── renderDayOfWeekBars ───────────────────────────────────────────

  function renderDayOfWeekBars(canvasId, dayData) {
    if (!dayData || dayData.length === 0) return null;

    var labels     = dayData.map(function (d) { return d.day; });
    var energies   = dayData.map(function (d) { return d.energy; });
    var confidences = dayData.map(function (d) { return d.confidence; });

    var config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Energy',
            data: energies,
            backgroundColor: TEAL,
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: 'Confidence',
            data: confidences,
            backgroundColor: CORAL,
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: 'rgba(255,255,255,0.7)', usePointStyle: true, padding: 16 }
          }
        },
        scales: darkScaleOptions(0, 10)
      }
    };

    return getOrCreateChart(canvasId, config);
  }

  // ── renderWeekAheadBars ───────────────────────────────────────────

  function renderWeekAheadBars(canvasId, predictions) {
    if (!predictions || predictions.length === 0) return null;

    var labels = predictions.map(function (p) { return p.dayName; });
    var energies    = predictions.map(function (p) { return p.predictedEnergy; });
    var confidences = predictions.map(function (p) { return p.predictedConfidence; });

    var config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Predicted Energy',
            data: energies,
            backgroundColor: 'rgba(45,138,138,0.7)',
            borderColor: TEAL,
            borderWidth: 2,
            borderDash: [5, 3],
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: 'Predicted Confidence',
            data: confidences,
            backgroundColor: 'rgba(232,116,97,0.7)',
            borderColor: CORAL,
            borderWidth: 2,
            borderDash: [5, 3],
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: 'rgba(255,255,255,0.7)', usePointStyle: true, padding: 16 }
          }
        },
        scales: darkScaleOptions(0, 10)
      }
    };

    return getOrCreateChart(canvasId, config);
  }

  // ── destroyAll ────────────────────────────────────────────────────

  function destroyAll() {
    var keys = Object.keys(chartInstances);
    for (var i = 0; i < keys.length; i++) {
      if (chartInstances[keys[i]]) {
        chartInstances[keys[i]].destroy();
      }
    }
    chartInstances = {};
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    renderTimeline: renderTimeline,
    renderDayOfWeekBars: renderDayOfWeekBars,
    renderWeekAheadBars: renderWeekAheadBars,
    destroyAll: destroyAll
  };
})();
