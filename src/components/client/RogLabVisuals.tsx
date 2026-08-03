type LabVisualProps = { className?: string };

export function RogLabCircuitLayer({ className = '', compact = false }: { className?: string; compact?: boolean }) {
    return (
        <svg aria-hidden="true" className={`live-rog-circuit-layer ${compact ? 'is-compact' : ''} ${className}`} viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="rogTraceGold" x1="0" x2="1">
                    <stop offset="0" stopColor="#c9a45d" stopOpacity="0" />
                    <stop offset=".18" stopColor="#c9a45d" stopOpacity=".48" />
                    <stop offset=".72" stopColor="#e2c17c" stopOpacity=".34" />
                    <stop offset="1" stopColor="#c9a45d" stopOpacity="0" />
                </linearGradient>
                <filter id="rogTraceGlow" x="-20%" y="-40%" width="140%" height="180%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            <g fill="none" stroke="url(#rogTraceGold)" strokeWidth="1.15">
                <path d="M0 96 H180 L216 132 H464 L495 101 H748 L786 62 H1000" />
                <path d="M0 304 H104 L136 272 H337 L373 309 H590 L617 282 H796 L828 315 H1000" />
                <path d="M0 472 H164 L203 433 H404 L441 470 H638 L681 427 H850 L892 469 H1000" />
                <path d="M296 0 V112 L330 146 V246 L294 282 V408 L335 449 V620" />
                <path d="M687 0 V74 L653 108 V214 L694 255 V364 L658 400 V620" />
                <path d="M104 0 V51 L147 94 M890 0 V66 L847 109" strokeOpacity=".42" />
            </g>
            <g fill="#c9a45d" filter="url(#rogTraceGlow)">
                <circle cx="216" cy="132" r="2" /><circle cx="495" cy="101" r="2.3" />
                <circle cx="136" cy="272" r="2" /><circle cx="617" cy="282" r="2" />
                <circle cx="203" cy="433" r="2" /><circle cx="681" cy="427" r="2" />
            </g>
            <g fill="#e3262e" opacity=".72"><circle cx="786" cy="62" r="1.8" /><circle cx="828" cy="315" r="1.8" /><circle cx="892" cy="469" r="1.8" /></g>
        </svg>
    );
}

/** The board is deliberately decomposed so it reads as hardware behind the rows, not as a background photo. */
export function RogLabBoardStack({ className = '' }: LabVisualProps) {
    return (
        <svg aria-hidden="true" className={`live-rog-board-stack ${className}`} viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="rogBoardMetal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#526066" stopOpacity=".62" /><stop offset=".5" stopColor="#14191b" stopOpacity=".22" /><stop offset="1" stopColor="#c6a566" stopOpacity=".34" />
                </linearGradient>
                <linearGradient id="rogGpuMetal" x1="0" x2="1"><stop stopColor="#d5b46c" stopOpacity=".42" /><stop offset=".5" stopColor="#4b5557" stopOpacity=".15" /><stop offset="1" stopColor="#d5b46c" stopOpacity=".32" /></linearGradient>
                <pattern id="rogSocketGrid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M1 1h1v1H1z" fill="#ead9ab" opacity=".6" /></pattern>
            </defs>
            <g className="live-rog-board-base" fill="none">
                <path d="M104 74h681l42 42v344l-35 35H210l-65-65V132z" fill="url(#rogBoardMetal)" stroke="#c9a45d" strokeOpacity=".38" strokeWidth="2" />
                <path d="M127 96h622l54 54v278l-34 38H235l-84-84V138z" stroke="#e8edf0" strokeOpacity=".18" strokeWidth="1" />
                <path d="M104 74h100l18 18h-97m702 24h-80l-18 18h94M210 495v-40l22-22m560 27v-42l-18-18" stroke="#e2c17c" strokeOpacity=".7" strokeWidth="3" />
            </g>
            <g className="live-rog-board-vrm" fill="#d8c38c" fillOpacity=".28" stroke="#e6d4a0" strokeOpacity=".34">
                {[0, 1, 2, 3, 4, 5].map(index => <rect key={index} x={404 + index * 30} y="126" width="20" height="25" rx="2" />)}
                {[0, 1, 2, 3].map(index => <rect key={`side-${index}`} x="330" y={190 + index * 31} width="26" height="20" rx="2" />)}
            </g>
            <g className="live-rog-board-cpu">
                <path d="M395 176h160l20 20v154l-20 20H395l-20-20V196z" fill="#172022" fillOpacity=".42" stroke="#d7bd78" strokeOpacity=".64" strokeWidth="3" />
                <rect x="415" y="196" width="120" height="154" fill="url(#rogSocketGrid)" opacity=".65" />
                <path d="M429 210h92v125h-92z" fill="none" stroke="#e6e9e6" strokeOpacity=".27" />
                <path d="M381 251h-34m228 0h36M475 162v-28m0 236v28" stroke="#c9a45d" strokeOpacity=".65" strokeWidth="3" />
                <text x="438" y="282" fill="#efdfb5" fillOpacity=".72" fontSize="11" fontFamily="ui-monospace, monospace" letterSpacing="3">CPU SOCKET</text>
            </g>
            <g className="live-rog-board-memory" fill="#111719" fillOpacity=".64" stroke="#ccb06c" strokeOpacity=".52">
                {[0, 1, 2, 3].map(index => <rect key={index} x={592 + index * 24} y="155" width="13" height="236" rx="2" />)}
                <path d="M583 145h127M583 400h127" stroke="#e2c17c" strokeOpacity=".42" />
                <text x="590" y="138" fill="#efdfb5" fillOpacity=".66" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="2">DDR5 / BANK A</text>
            </g>
            <g className="live-rog-board-m2" fill="#1e282a" fillOpacity=".44" stroke="#d4b874" strokeOpacity=".5">
                <path d="M226 172h109l13 13v19l-13 13H226l-13-13v-19z" /><path d="M226 237h109l13 13v19l-13 13H226l-13-13v-19z" />
                <circle cx="242" cy="194" r="4" /><circle cx="242" cy="259" r="4" />
                <text x="250" y="198" fill="#eadfbf" fillOpacity=".6" fontSize="8" fontFamily="ui-monospace, monospace">M.2_01</text>
            </g>
            <g className="live-rog-board-pcie" fill="none" stroke="#b89a5b" strokeOpacity=".58">
                <path d="M244 330h118l13 13v9l-13 13H244z" strokeWidth="3" /><path d="M244 391h118l13 13v9l-13 13H244z" strokeWidth="2" />
                <path d="M246 345h112m-112 61h112" stroke="#e8dcc0" strokeOpacity=".26" strokeDasharray="3 5" />
            </g>
            <g className="live-rog-board-gpu">
                <path d="M365 432h314l25 19v48l-25 18H365l-22-16v-52z" fill="url(#rogGpuMetal)" stroke="#d5b46c" strokeOpacity=".56" strokeWidth="2" />
                {[0, 1, 2].map(index => <circle key={index} cx={430 + index * 88} cy="474" r="27" fill="#101719" fillOpacity=".78" stroke="#d8c183" strokeOpacity=".5" strokeWidth="2" />)}
                {[0, 1, 2].map(index => <path key={`fan-${index}`} d={`M${430 + index * 88} 447c14 8 15 28 0 27-14-1-15-21 0-27m0 27c14 7 14 27 0 27-14 0-14-20 0-27m0 0c-14 8-15 28 0 27`} fill="none" stroke="#d8c183" strokeOpacity=".5" />)}
                <path d="M681 446v57l34-11v-35z" fill="#c9a45d" fillOpacity=".42" /><text x="376" y="510" fill="#efdca6" fillOpacity=".7" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="2">GPU / ASTRAL BUS</text>
            </g>
            <g className="live-rog-board-caps" fill="#dfc987" fillOpacity=".36" stroke="#f1e2b5" strokeOpacity=".36">
                {[0,1,2,3,4,5,6,7].map(index => <circle key={index} cx={741 + (index % 2) * 20} cy={180 + Math.floor(index / 2) * 34} r="7" />)}
            </g>
            <g className="live-rog-board-traces" fill="none" stroke="#d1af69" strokeOpacity=".42" strokeWidth="1.4">
                <path d="M356 209h34l17 17m150-14h43l13 13m-66 132h42l22 22h66m-295 104h-79l-18-18H175m510 0h72l22-22h50" />
                <path d="M348 285h32l17-18m179 81h57l18-18h114M376 452H265l-18-18h-82" />
            </g>
            <g className="live-rog-board-fasteners" fill="#ead7a1" fillOpacity=".7">
                <circle cx="150" cy="119" r="5" /><circle cx="779" cy="150" r="5" /><circle cx="245" cy="447" r="5" /><circle cx="773" cy="438" r="5" />
            </g>
        </svg>
    );
}

export function RogLabRowTrace() {
    return <span className="live-rog-row-trace" aria-hidden="true"><i /><b /><em /></span>;
}

export function RogLabScanFrame() {
    return <span className="live-rog-scan-frame" aria-hidden="true"><i /><i /><i /><i /></span>;
}

export function RogLabTotalBus({ className = '' }: LabVisualProps) {
    return (
        <svg aria-hidden="true" className={`live-rog-total-bus-trace ${className}`} viewBox="0 0 300 76" preserveAspectRatio="none">
            <path d="M0 40h54l18-18h70l16 18h142" fill="none" stroke="currentColor" strokeOpacity=".58" strokeWidth="1.4" />
            <path d="M0 48h42l16 16h96l17-16h129" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="1" />
            <g fill="currentColor"><circle cx="72" cy="22" r="3" /><circle cx="158" cy="40" r="3" /><circle cx="171" cy="48" r="2.5" /></g>
            <circle className="live-rog-total-bus-pulse" cx="12" cy="40" r="3" fill="#e2c17c" />
        </svg>
    );
}
