import { Tab, SavedSession, TabGroup, UserProfile } from '../types/types'


export interface StorageAdapter {
    getAllSessions(): Promise<SavedSession[]>;
    getSessionCount(): Promise<number>;
    saveSession: (name: string, tabs: Tab[]) => Promise<'cloud' | 'local' | 'duplicate' | 'error' | 'limit'>;
    deleteSession: (sessionName: string) => Promise<'cloud' | 'local' | 'not_found'>;
    getAllGroups(): Promise<TabGroup[]>;
    getGroupCount(): Promise<number>;
    saveGroup: (name: string, tabs: Tab[]) => Promise<'cloud' | 'local' | 'duplicate' | 'error'>;
    deleteGroup: (name: string) => Promise<'cloud' | 'local' | 'not_found' >;

    getUserProfile(): Promise<UserProfile | null>;
}