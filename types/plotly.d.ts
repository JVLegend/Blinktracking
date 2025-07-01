declare module 'react-plotly.js' {
  import { Component } from 'react';

  export interface PlotParams {
    data: Array<{
      x: number[];
      y: number[];
      name: string;
      type: string;
      mode: string;
      line?: {
        shape: string;
      };
      marker?: {
        size: number;
      };
    }>;
    layout: {
      title: string;
      xaxis: {
        title: string;
        gridcolor?: string;
        zerolinecolor?: string;
      };
      yaxis: {
        title: string;
        gridcolor?: string;
        zerolinecolor?: string;
      };
      height: number;
      showlegend: boolean;
      hovermode?: string;
      plot_bgcolor?: string;
      paper_bgcolor?: string;
    };
    config?: {
      responsive: boolean;
      displayModeBar?: boolean;
      displaylogo?: boolean;
      modeBarButtonsToRemove?: string[];
    };
    style?: {
      width: string;
      height: string;
    };
  }

  export default class Plot extends Component<PlotParams> {}
} 