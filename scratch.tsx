import React, { useState } from 'react';

export function QuantityInput({ value, onChange }: { value: number, onChange: (val: number) => void }) {
    return (
        <div className="flex items-center bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(Math.max(1, value - 1)); }} className={`text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-colors px-1`}>-</button>
            <input 
                type="number" 
                className="w-10 text-center text-sm dark:text-slate-200 bg-transparent border-none p-0 focus:ring-0 [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none" 
                value={value} 
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) onChange(val);
                }} 
            />
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(value + 1); }} className={`text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-colors px-1`}>+</button>
        </div>
    );
}
