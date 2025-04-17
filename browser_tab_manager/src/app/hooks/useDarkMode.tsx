// src/app/hooks/useDarkMode.ts
import { useEffect, useState } from 'react';

export default function useDarkMode() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        chrome.storage.sync.get(['darkMode'], (result) => {
            const stored = result.darkMode ?? false;
            setEnabled(stored);
            document.documentElement.classList.toggle('dark', stored);
        });
    }, []);

    const toggle = () => {
        const newValue = !enabled;
        setEnabled(newValue);
        chrome.storage.sync.set({ darkMode: newValue });
        document.documentElement.classList.toggle('dark', newValue);
    };

    return { enabled, toggle };
}
