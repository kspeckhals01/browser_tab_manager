import { Tab } from '../domain/Tab';

export type SavedSession = {
    id?: string;
    name: string;
    createdAt: string;
    tabs: Tab[];
};

export type TabGroup = {
    id?: string;
    name: string;
    createdAt: string;
    tabs: Tab[];
};

const SESSION_KEY = 'local_sessions';
const GROUP_KEY = 'local_groups';

export async function getAllLocalSessions(): Promise<SavedSession[]> {
    return new Promise((resolve) => {
        chrome.storage.local.get([SESSION_KEY], (result) => {
            resolve(result[SESSION_KEY] || []);
        });
    });
}



export async function saveLocalSession(session: SavedSession): Promise<void> {
    const sessions = await getAllLocalSessions();
    sessions.push(session);

    await chrome.storage.local.set({
        [SESSION_KEY]: sessions,
        localSessionCount: sessions.length
    });
}

export async function deleteLocalSession(name: string): Promise<void> {
    const sessions = await getAllLocalSessions();
    const filtered = sessions.filter((s) => s.name !== name);

    await chrome.storage.local.set({
        [SESSION_KEY]: filtered,
        localSessionCount: Math.max(filtered.length, 0)
    });
}

export async function clearAllLocalGroups(): Promise<void> {
    await chrome.storage.local.remove(GROUP_KEY);
    console.log(`Cleared all local groups from '${GROUP_KEY}'`);
}

export async function getAllLocalGroups(): Promise<TabGroup[]> {
    return new Promise((resolve) => {
        chrome.storage.local.get([GROUP_KEY], (result) => {
            resolve(result[GROUP_KEY] || []);
        });
    });
}

export async function renameLocalGroup(oldName: string, newName: string): Promise<void> {
    const groups = await getAllLocalGroups();

    // Ensure no naming conflict
    if (groups.some((g) => g.name === newName)) {
        throw new Error('A group with that name already exists.');
    }

    const updatedGroups = groups.map((g) =>
        g.name === oldName ? { ...g, name: newName } : g
    );

    await chrome.storage.local.set({
        [GROUP_KEY]: updatedGroups,
        localGroupCount: updatedGroups.length,
    });
}

export async function removeTabFromLocalGroup(groupName: string, tabId: number): Promise<void> {
    const groups = await getAllLocalGroups();

    const updatedGroups = groups.map((g) =>
        g.name === groupName
            ? { ...g, tabs: g.tabs.filter((tab) => tab.id !== tabId) }
            : g
    );

    await chrome.storage.local.set({
        [GROUP_KEY]: updatedGroups,
        localGroupCount: updatedGroups.length,
    });
}


export async function saveLocalGroup(group: TabGroup): Promise<void> {
    const groups = await getAllLocalGroups();

    // Normalize tab IDs
    const normalizedTabs = group.tabs.map((tab, index) => ({
        ...tab,
        id: tab.id ?? index,
    }));

    groups.push({ ...group, tabs: normalizedTabs });

    await chrome.storage.local.set({
        local_groups: groups,
        localGroupCount: groups.length,
    });
}

export async function deleteLocalGroup(name: string): Promise<void> {
    const groups = await getAllLocalGroups();
    const filtered = groups.filter((g) => g.name !== name);

    await chrome.storage.local.set({
        [GROUP_KEY]: filtered,
        localGroupCount: filtered.length,
    });
}
