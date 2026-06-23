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
    layout: Record<string, any>;
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
