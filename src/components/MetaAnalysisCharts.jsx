import React from 'react';
import Plot from 'react-plotly.js';

/**
 * Forest Plot Component
 * Visualiza el efecto de cada estudio y el efecto combinado
 */
export const ForestPlot = ({ extractionData, metrics }) => {
  if (!extractionData || extractionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No data available for Forest Plot</p>
      </div>
    );
  }

  // Preparar datos para el Forest Plot
  const studies = extractionData.map((study, index) => {
    const effect = study.mean_intervention - study.mean_control;
    const se = 0.5; // Error estándar simulado
    const ci_lower = effect - 1.96 * se;
    const ci_upper = effect + 1.96 * se;

    return {
      name: study.title || `Study ${index + 1}`,
      effect,
      ci_lower,
      ci_upper,
      n: study.n_intervention + study.n_control,
    };
  });

  // Calcular efecto combinado
  const combinedEffect = studies.reduce((sum, s) => sum + s.effect, 0) / studies.length;
  const combinedSE = 0.3;
  const combinedCI_lower = combinedEffect - 1.96 * combinedSE;
  const combinedCI_upper = combinedEffect + 1.96 * combinedSE;

  // Preparar datos para Plotly
  const y_labels = studies.map(s => s.name).concat(['Combined Effect']);
  const x_values = studies.map(s => s.effect).concat([combinedEffect]);
  const error_x = {
    type: 'data',
    symmetric: false,
    array: studies.map(s => s.ci_upper - s.effect).concat([combinedCI_upper - combinedEffect]),
    arrayminus: studies.map(s => s.effect - s.ci_lower).concat([combinedEffect - combinedCI_lower]),
  };

  // Colores: estudios en azul, efecto combinado en rojo
  const colors = [...Array(studies.length).fill('#2196F3'), '#E74C3C'];

  const trace = {
    x: x_values,
    y: y_labels,
    error_x,
    mode: 'markers',
    marker: {
      size: 10,
      color: colors,
      line: {
        color: 'rgba(0,0,0,0.5)',
        width: 1,
      },
    },
    type: 'scatter',
    hovertemplate: '<b>%{y}</b><br>Effect: %{x:.2f}<br>95% CI: [%{error_x.arrayminus}, %{error_x.array}]<extra></extra>',
  };

  const layout = {
    title: {
      text: '<b>Forest Plot - Meta-Analysis Results</b>',
      font: { size: 18, color: '#1a1a1a' },
    },
    xaxis: {
      title: 'Effect Size (Mean Difference)',
      zeroline: true,
      zerolinewidth: 2,
      zerolinecolor: '#999',
      gridcolor: '#E0E0E0',
    },
    yaxis: {
      title: 'Studies',
      autorange: 'reversed',
    },
    plot_bgcolor: '#f8f9fa',
    paper_bgcolor: '#ffffff',
    hovermode: 'closest',
    margin: { l: 250, r: 100, t: 80, b: 80 },
    height: 400 + studies.length * 30,
    font: { family: 'Arial, sans-serif', size: 12, color: '#333' },
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  return (
    <Plot
      data={[trace]}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

/**
 * Funnel Plot Component
 * Visualiza el sesgo de publicación
 */
export const FunnelPlot = ({ extractionData, metrics }) => {
  if (!extractionData || extractionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No data available for Funnel Plot</p>
      </div>
    );
  }

  // Preparar datos para el Funnel Plot
  const studies = extractionData.map((study, index) => {
    const effect = study.mean_intervention - study.mean_control;
    const se = 0.1 + (index * 0.05); // Error estándar aumenta con el índice
    return {
      name: study.title || `Study ${index + 1}`,
      effect,
      se,
    };
  });

  // Calcular efecto combinado
  const combinedEffect = studies.reduce((sum, s) => sum + s.effect, 0) / studies.length;

  // Preparar datos para Plotly
  const trace = {
    x: studies.map(s => s.effect),
    y: studies.map(s => s.se),
    mode: 'markers',
    marker: {
      size: 10,
      color: '#3498DB',
      line: {
        color: 'rgba(0,0,0,0.5)',
        width: 1,
      },
    },
    type: 'scatter',
    hovertemplate: '<b>%{customdata}</b><br>Effect: %{x:.2f}<br>SE: %{y:.3f}<extra></extra>',
    customdata: studies.map(s => s.name),
  };

  // Línea de efecto nulo
  const nullEffectLine = {
    x: [combinedEffect, combinedEffect],
    y: [0, Math.max(...studies.map(s => s.se)) * 1.2],
    mode: 'lines',
    line: {
      color: '#999',
      width: 2,
      dash: 'dash',
    },
    name: 'No Effect',
    hoverinfo: 'skip',
  };

  // Líneas de confianza (95%)
  const maxSE = Math.max(...studies.map(s => s.se));
  const confidenceLines = {
    x: [
      combinedEffect - 2 * maxSE,
      combinedEffect,
      combinedEffect + 2 * maxSE,
    ],
    y: [0, maxSE * 1.2, 0],
    mode: 'lines',
    line: {
      color: '#E0E0E0',
      width: 1,
      dash: 'dot',
    },
    name: '95% CI',
    hoverinfo: 'skip',
  };

  const layout = {
    title: {
      text: '<b>Funnel Plot - Publication Bias Assessment</b>',
      font: { size: 18, color: '#1a1a1a' },
    },
    xaxis: {
      title: 'Effect Size (Mean Difference)',
      zeroline: false,
      gridcolor: '#E0E0E0',
    },
    yaxis: {
      title: 'Standard Error',
      autorange: 'reversed',
      gridcolor: '#E0E0E0',
    },
    plot_bgcolor: '#f8f9fa',
    paper_bgcolor: '#ffffff',
    hovermode: 'closest',
    margin: { l: 100, r: 100, t: 80, b: 80 },
    height: 500,
    font: { family: 'Arial, sans-serif', size: 12, color: '#333' },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#ccc',
      borderwidth: 1,
    },
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  return (
    <Plot
      data={[trace, nullEffectLine, confidenceLines]}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

/**
 * Legend Component para Forest Plot
 */
export const ForestPlotLegend = ({ extractionData }) => {
  if (!extractionData || extractionData.length === 0) return null;

  const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFEB3B', '#795548', '#E91E63', '#009688'];

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm" style={{ maxWidth: '300px' }}>
      <h3 className="font-bold text-sm mb-3 text-gray-800">Studies</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {extractionData.map((study, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-gray-700 truncate" title={study.title}>
              {study.title ? (study.title.length > 30 ? study.title.substring(0, 27) + '...' : study.title) : `Study ${index + 1}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Legend Component para Funnel Plot
 */
export const FunnelPlotLegend = ({ metrics }) => {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm" style={{ maxWidth: '300px' }}>
      <h3 className="font-bold text-sm mb-3 text-gray-800">Interpretation</h3>
      <div className="space-y-2 text-xs text-gray-700">
        <p>• <strong>Symmetric:</strong> No publication bias</p>
        <p>• <strong>Asymmetric:</strong> Possible publication bias</p>
        <p>• <strong>I²:</strong> {metrics?.i2 || 'N/A'}% (Heterogeneity)</p>
        <p>• <strong>p-value:</strong> {metrics?.pValue || 'N/A'}</p>
      </div>
    </div>
  );
};
