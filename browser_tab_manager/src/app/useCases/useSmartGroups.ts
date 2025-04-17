import { useCallback } from 'react';
import { Tab } from '../../domain/Tab';
import { callSmartGroupTabs } from '../../utils/smartGroupClient';

export default function useSmartGroup() {
    return useCallback(async (tabs: Tab[]) => {
        return await callSmartGroupTabs(tabs);
    }, []);
}
