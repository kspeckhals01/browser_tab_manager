
import {
    getAllSessionsFromSupabase,
    saveSessionToSupabase,
    deleteSessionFromSupabase,
    getAllGroupsFromSupabase,
    saveGroupToSupabase,
    deleteGroupFromSupabase,
    getUserProfile,
    incrementSessionsUsed,
    decrementSessionsUsed,
    incrementGroupsUsed,
    decrementGroupsUsed
} from './supabaseTabStorage';

import {
    getAllLocalSessions,
    saveLocalSession,
    deleteLocalSession,
    getAllLocalGroups,
    saveLocalGroup,
    deleteLocalGroup
} from './localTabStorage';

import { Tab } from '../domain/Tab';
import { UserTier, SavedSession, TabGroup } from '../types/types'
import { validateUserTier } from '../utils/validateUserTier';
import { supabase } from '../lib/supabase';



export async function getStorageAdapter() {
    const tier: UserTier = await validateUserTier(); 
    console.log('[getStorageAdapter] tier from validateUserTier:', tier);
    const isPro = tier === 'pro';
    const isExpired = tier === 'expired';

    return {
        // SESSIONS
        getAllSessions: async () => {
            if (isPro) {
                return await getAllSessionsFromSupabase();
            }

            if (isExpired) {
                const [cloud, local] = await Promise.all([
                    getAllSessionsFromSupabase(),
                    getAllLocalSessions()
                ]);
                return [...cloud, ...local];
            }

            return await getAllLocalSessions();
        },
        getSessionCount: async () => {
            if (isPro) {
                const sessions = await getAllSessionsFromSupabase();
                return sessions.length;
            }

            if (isExpired) {
                const [cloud, local] = await Promise.all([
                    getAllSessionsFromSupabase(),
                    getAllLocalSessions()
                ]);
                return cloud.length + local.length;
            }

            const sessions = await getAllLocalSessions();
            return sessions.length;
        },
        saveSession: async (name: string, tabs: Tab[]) => {
            if (isPro) {
                const result = await saveSessionToSupabase(name, tabs);
                const user = await chrome.storage.local.get(['userId']);

                if (user.userId && result === 'success') {
                    await incrementSessionsUsed(user.userId);
                }

                return result === 'success' ? 'cloud' : result;
            } else {
                const existing = await getAllLocalSessions();
                if (existing.length >= 5) return 'limit';
                if (existing.some((s) => s.name === name)) return 'duplicate';

                const newSession: SavedSession = {
                    name,
                    createdAt: new Date().toISOString(),
                    tabs
                };

                await saveLocalSession(newSession);
                return 'local';
            }
        },
        deleteSession: async (sessionName: string) => {
            const { userId, tier } = await chrome.storage.local.get(['userId', 'tier']);
            const isCloudUser = tier === 'pro' || tier === 'expired';

            const [cloudSessions, localSessions] = await Promise.all([
                getAllSessionsFromSupabase(),
                getAllLocalSessions()
            ]);

            const inSupabase = cloudSessions.some(s => s.name === sessionName);
            const inLocal = localSessions.some(s => s.name === sessionName);

            if (userId && isCloudUser && inSupabase) {
                const result = await deleteSessionFromSupabase(sessionName, userId);

                if (result === 'deleted') {
                    await decrementSessionsUsed(userId);
                    return 'cloud';
                }

                return 'not_found';
            } else if (inLocal) {
                await deleteLocalSession(sessionName);
                return 'local';
            } else {
                console.warn(`Session "${sessionName}" not found in local or Supabase.`);
                return 'not_found';
            }
        },


        // GROUPS
        getAllGroups: async () => {
            if (isPro) {
                return await getAllGroupsFromSupabase();
            }

            if (isExpired) {
                const [cloud, local] = await Promise.all([
                    getAllGroupsFromSupabase(),
                    getAllLocalGroups()
                ]);
                return [...cloud, ...local];
            }

            return await getAllLocalGroups();
        },
        getGroupCount: async () => {
            if (isPro) {
                const groups = await getAllGroupsFromSupabase();
                return groups.length;
            }

            if (isExpired) {
                const [cloud, local] = await Promise.all([
                    getAllGroupsFromSupabase(),
                    getAllLocalGroups()
                ]);
                return cloud.length + local.length;
            }

            const groups = await getAllLocalGroups();
            return groups.length;
        },
        saveGroup: async (name: string, tabs: Tab[]) => {
            const newGroup: TabGroup = {
                name,
                createdAt: new Date().toISOString(),
                tabs
            };

            if (isPro) {
                const result = await saveGroupToSupabase(name, tabs);
                const { userId } = await chrome.storage.local.get(['userId']);

                if (userId && result === 'success') {
                    await incrementGroupsUsed(userId);
                }

                return result === 'success' ? 'cloud' : result;
            }

            // Free or Expired users
            await saveLocalGroup(newGroup);

            //Increment local group count manually
            const { groups_used = 0 } = await chrome.storage.local.get(['groups_used']);
            await chrome.storage.local.set({ groups_used: groups_used + 1 });

            return 'local';
        },
        deleteGroup: async (groupName: string) => {
            const { userId, tier } = await chrome.storage.local.get(['userId', 'tier']);
            const isPro = tier === 'pro';
            const isExpired = tier === 'expired';

            const [cloudGroups, localGroups] = await Promise.all([
                getAllGroupsFromSupabase(),
                getAllLocalGroups()
            ]);

            const inSupabase = cloudGroups.some(g => g.name === groupName);
            const inLocal = localGroups.some(g => g.name === groupName);

            if (userId && (isPro || isExpired) && inSupabase) {
                await deleteGroupFromSupabase(groupName, userId);
                if (isPro) await decrementGroupsUsed(userId);
                return 'cloud';
            } else if (inLocal) {
                await deleteLocalGroup(groupName);
                return 'local';
            } else {
                console.warn(`Group "${groupName}" not found.`);
                return 'not_found';
            }
        },

        // Optional user info (for display or enforcement)
        getUserProfile: async () => {
            const user = await chrome.storage.local.get(['userId']);
            if (user.userId) {
                return await getUserProfile(user.userId);
            }
            return null;
        },

        renameGroup: async (oldName: string, newName: string) => {
            const { userId, tier } = await chrome.storage.local.get(['userId', 'tier']);
            const isPro = tier === 'pro';
            const isExpired = tier === 'expired';

            if (isPro || isExpired) {
                // Supabase logic
                const { error } = await supabase
                    .from('groups')
                    .update({ name: newName })
                    .eq('name', oldName)
                    .eq('user_id', userId);
                if (error) throw new Error('Failed to rename group in Supabase');
                return 'cloud';
            } else {
                // Local storage logic
                const groups = await getAllLocalGroups();
                const updatedGroups = groups.map((g) =>
                    g.name === oldName ? { ...g, name: newName } : g
                );
                await chrome.storage.local.set({ local_groups: updatedGroups });
                return 'local';
            }
        },

        removeTabFromGroup: async (groupName: string, tabId: number) => {
            const { userId, tier } = await chrome.storage.local.get(['userId', 'tier']);
            const isPro = tier === 'pro';
            const isExpired = tier === 'expired';

            if (isPro || isExpired) {
                const { data, error } = await supabase
                    .from('groups')
                    .select('id, tabs')
                    .eq('user_id', userId)
                    .eq('name', groupName)
                    .maybeSingle();

                if (error || !data) {
                    console.error('[removeTabFromGroup] Failed to load group:', error);
                    throw new Error('Group not found');
                }

                const originalTabs: Tab[] = Array.isArray(data.tabs) ? data.tabs : [];

                const updatedTabs = originalTabs.filter((tab: Tab) => tab.id !== tabId);

                const { error: updateError } = await supabase
                    .from('groups')
                    .update({ tabs: updatedTabs })
                    .eq('id', data.id);

                if (updateError) {
                    console.error('[removeTabFromGroup] Failed to update group:', updateError);
                    throw new Error('Update failed');
                }

                return 'cloud';
            }

            // handle local fallback here if needed
        


            // Local fallback
            const groups = await getAllLocalGroups();
            const updatedGroups = groups.map((g) =>
                g.name === groupName
                    ? { ...g, tabs: g.tabs.filter((tab) => tab.id !== tabId) }
                    : g
            );
            await chrome.storage.local.set({ local_groups: updatedGroups });
            return 'local';
        },

    };
}

export async function getUserTier(): Promise<UserTier> {
    const userId = (await chrome.storage.local.get(['userId'])).userId;

    if (!userId) return 'free'; // fallback

    const profile = await getUserProfile(userId);

    const tier: UserTier = profile?.tier ?? 'free';

    // Update localStorage with accurate tier
    await chrome.storage.local.set({ tier });

    return tier;
}