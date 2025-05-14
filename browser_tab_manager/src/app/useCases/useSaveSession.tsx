import { fetchAllTabs } from '../../infrastructure/chromeTabs';
import { getStorageAdapter, getUserTier } from '../../infrastructure/storageAdapter';

const MAX_SESSIONS_FREE = 5;

export default function useSaveSession() {
    return async (name: string): Promise<'cloud' | 'local' | 'duplicate' | 'limit' | 'error'> => {
        try {
            const tabs = await fetchAllTabs();
            const storage = await getStorageAdapter();
            const tier = await getUserTier();

            if (tier === 'free') {
                const sessions = await storage.getAllSessions();
                if (sessions.some((s) => s.name === name)) {
                    return 'duplicate';
                }
                if (sessions.length >= MAX_SESSIONS_FREE) {
                    return 'limit';
                }
            }

            const result = await storage.saveSession(name, tabs);
            return result;
        } catch (err) {
            console.error('[useSaveSession] Failed to save session:', err);
            return 'error';
        }
    };
}