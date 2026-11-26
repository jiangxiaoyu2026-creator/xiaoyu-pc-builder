import { useEffect, useRef } from 'react';
import rough from 'roughjs/bin/rough';

type RoughFrameProps = {
    className?: string;
    color?: string;
    seed: number;
    padding?: number;
    roughness?: number;
    strokeWidth?: number;
};

export function RoughFrame({
    className = '',
    color = '#263f60',
    seed,
    padding = 4,
    roughness = 1.35,
    strokeWidth = 1.7,
}: RoughFrameProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const draw = () => {
            const { width, height } = svg.getBoundingClientRect();
            if (width < 2 || height < 2) return;
            svg.replaceChildren();
            const sketch = rough.svg(svg);
            svg.appendChild(sketch.rectangle(padding, padding, width - padding * 2, height - padding * 2, {
                stroke: color,
                strokeWidth,
                roughness,
                bowing: .7,
                seed,
            }));
        };

        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(svg);
        return () => observer.disconnect();
    }, [color, padding, roughness, seed, strokeWidth]);

    return <svg ref={svgRef} className={className} aria-hidden="true" />;
}
