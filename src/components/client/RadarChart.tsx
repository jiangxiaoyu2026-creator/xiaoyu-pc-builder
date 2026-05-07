import React, { useEffect, useRef } from 'react';

interface RadarData {
    labels: string[];
    dataA: number[];
    dataB: number[];
    colorA: string;
    colorB: string;
    fillA: string;
    fillB: string;
}

export const RadarChart: React.FC<{ data: RadarData, size?: number }> = ({ data, size = 200 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Apply high DPI scaling
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;

        ctx.clearRect(0, 0, size, size);

        const center = size / 2;
        const radius = (size / 2) * 0.75;
        const numPoints = data.labels.length;
        const angleStep = (Math.PI * 2) / numPoints;

        // Draw background grid
        ctx.strokeStyle = '#E2E8F0'; // slate-200
        ctx.lineWidth = 1;
        
        for (let level = 1; level <= 4; level++) {
            const levelRadius = (radius / 4) * level;
            ctx.beginPath();
            for (let i = 0; i < numPoints; i++) {
                const angle = i * angleStep - Math.PI / 2;
                const x = center + Math.cos(angle) * levelRadius;
                const y = center + Math.sin(angle) * levelRadius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Fill alternate rings with very light gray for depth
            if (level % 2 === 0) {
                ctx.fillStyle = 'rgba(248, 250, 252, 0.5)'; // slate-50
                ctx.fill();
            }
        }

        // Draw axes
        ctx.strokeStyle = '#E2E8F0';
        for (let i = 0; i < numPoints; i++) {
            const angle = i * angleStep - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
            ctx.stroke();
        }

        // Draw labels
        ctx.fillStyle = '#64748B'; // slate-500
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < numPoints; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const labelRadius = radius + 15;
            const x = center + Math.cos(angle) * labelRadius;
            const y = center + Math.sin(angle) * labelRadius;
            ctx.fillText(data.labels[i], x, y);
        }

        const drawPolygon = (dataPoints: number[], strokeColor: string, fillColor: string) => {
            ctx.beginPath();
            for (let i = 0; i < numPoints; i++) {
                const angle = i * angleStep - Math.PI / 2;
                // Normalize data point to [0, 1] range. Assuming max value is 100 for simplicity of this radar
                const normalizedVal = Math.max(0.1, Math.min(1, dataPoints[i] / 100));
                const pointRadius = radius * normalizedVal;
                const x = center + Math.cos(angle) * pointRadius;
                const y = center + Math.sin(angle) * pointRadius;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            
            ctx.fillStyle = fillColor;
            ctx.fill();
            
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw data points
            for (let i = 0; i < numPoints; i++) {
                const angle = i * angleStep - Math.PI / 2;
                const normalizedVal = Math.max(0.1, Math.min(1, dataPoints[i] / 100));
                const pointRadius = radius * normalizedVal;
                const x = center + Math.cos(angle) * pointRadius;
                const y = center + Math.sin(angle) * pointRadius;
                
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = strokeColor;
                ctx.fill();
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        };

        // Draw Data B (Orange - Loser usually underneath)
        drawPolygon(data.dataB, data.colorB, data.fillB);
        // Draw Data A (Indigo - Winner usually on top)
        drawPolygon(data.dataA, data.colorA, data.fillA);

    }, [data, size]);

    return (
        <div className="flex justify-center items-center animate-radar-draw">
            <canvas ref={canvasRef} />
        </div>
    );
};
