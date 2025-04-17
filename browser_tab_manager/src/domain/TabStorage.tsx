import { Tab } from '../domain/Tab'
import { SavedSession } from '../domain/SaveSession'

export interface TabStorage {
    saveSession(name: string, tabs: Tab[]): Promise<void>;
    getSessions(): Promise<SavedSession[]>;
    deleteSession(name: string): Promise<void>;
}
