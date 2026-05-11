import re

with open('src/components/client/StreamerWorkbench.tsx', 'r') as f:
    content = f.read()

ghost_cursor_code = """function GhostCursor({ x, y, active, status }: { x: number, y: number, active: boolean, status: string }) {
    return (
        <motion.div
            className={`fixed pointer-events-none z-[100] flex items-center justify-center -translate-x-1/2 -translate-y-1/2`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
                left: x, 
                top: y, 
                opacity: active && status ? 1 : 0,
                scale: active && status ? 1 : 0.9
            }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.5 }}
        >
            <div className="bg-indigo-600/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full shadow-xl shadow-indigo-600/20 whitespace-nowrap font-bold tracking-wide border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles size={12} className="animate-pulse" />
                {status || '...'}
            </div>
        </motion.div>
    );
}
"""

# Insert GhostCursor before export function StreamerWorkbench
content = content.replace("export function StreamerPermissionDenied()", ghost_cursor_code + "\n\nexport function StreamerPermissionDenied()")
# Wait, I might have deleted StreamerPermissionDenied too, since it was right after BouncyNumber!
# Let me just insert it before `function StreamerWorkbench(`

content = content.replace("function StreamerWorkbench(", ghost_cursor_code + "\nfunction StreamerWorkbench(")

# Remove unused imports
content = content.replace("import { CATEGORY_MAP } from '../../data/clientData';\n", "")
content = content.replace("import { getIconByCategory } from './Shared';\n", "")

with open('src/components/client/StreamerWorkbench.tsx', 'w') as f:
    f.write(content)

