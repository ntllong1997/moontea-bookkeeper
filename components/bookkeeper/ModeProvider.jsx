'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ModeContext = createContext({
    mode: 'business',
    setMode: () => {},
});

const STORAGE_KEY = 'moontea_mode';

export function ModeProvider({ children }) {
    const [mode, setMode] = useState('business');

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'business' || stored === 'all') {
            setMode(stored);
        }
    }, []);

    const updateMode = (next) => {
        setMode(next);
        localStorage.setItem(STORAGE_KEY, next);
    };

    return (
        <ModeContext.Provider value={{ mode, setMode: updateMode }}>
            {children}
        </ModeContext.Provider>
    );
}

export function useMode() {
    return useContext(ModeContext);
}
