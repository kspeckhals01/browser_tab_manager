import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
    const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);

    useEffect(() => {
        if (chrome.tabs) {
            chrome.tabs.query({}, (results) => {
                setTabs(results);
            });
        } else {
            console.warn('chrome.tabs is not available (maybe running outside extension context)');
        }
    }, []);

    return (
        <input type="text"></input>
    );
};

export default App;