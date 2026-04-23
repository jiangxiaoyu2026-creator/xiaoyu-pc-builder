import React from 'react';
import { renderToString } from 'react-dom/server';
import { GameFPSViewer } from './src/components/client/GameFPSViewer';

try {
    const html = renderToString(<GameFPSViewer />);
    console.log("Rendered successfully. HTML length:", html.length);
} catch (e) {
    console.error("Render failed!", e);
}
