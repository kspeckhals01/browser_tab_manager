import { Tab } from '../../domain/Tab';
import { getStorageAdapter } from '../../infrastructure/storageAdapter';

export default function useSaveGroup() {
    return async (name: string, tabs: Tab[]) => {
        const storage = await getStorageAdapter();
        const groups = await storage.getAllGroups();

        if (groups.length >= 2) {
            throw new Error('Group limit reached. Upgrade to Pro to save more groups.');
        }

        await storage.saveGroup(name, tabs);
    };
}