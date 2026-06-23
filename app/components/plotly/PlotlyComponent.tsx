"use client";

import { CSSProperties, useEffect, useRef } from 'react';
import Script from 'next/script';

interface PlotlyProps {
  data: any[];
  layout: any;
  config?: any;
  style?: CSSProperties;
}

export default function PlotlyComponent({ data, layout, config = {}, style }: PlotlyProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Plotly && plotRef.current) {
      window.Plotly.newPlot(plotRef.current, data, layout, config);
    }
  }, [data, layout, config]);

  return (
    <>
      <Script
        src="https://cdn.plot.ly/plotly-2.27.0.min.js"
        strategy="afterInteractive"
      />
      <div ref={plotRef} style={style} />
    </>
  );
}
