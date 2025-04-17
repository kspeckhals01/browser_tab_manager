import { supabase } from '../lib/supabase';
import { UserProfile, Tab } from '../types/types'

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

export async function syncLocalGroupsToSupabase(localGroups: TabGroup[]) {
    const supaUser = await supabase.auth.getUser();
    const user = supaUser.data.user;
    if (!user) throw new Error('User not authenticated');

    for (const group of localGroups) {
        await supabase.from('groups').insert({
            user_id: user.id,
            name: group.name,
            tabs: group.tabs,
            created_at: group.createdAt,
        });
    }
}


export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId);


    if (error) {
        console.error('Error fetching user profile:', error.message);
        return null;
    }

    if (!data || data.length === 0) {
        //console.warn(`No profile found for user: ${userId}`);
        return null;
    }

    return data[0];
}

export async function decrementGroupsUsed(userId: string) {
    const { error } = await supabase.rpc('decrement_column', {
        user_id: userId,
        column_name: 'groups_used',
    });

    if (error) {
        throw new Error(`Failed to decrement groups: ${error.message}`);
    }
}

export async function decrementSessionsUsed(userId: string) {
    const { error } = await supabase.rpc('decrement_column', {
        user_id: userId,
        column_name: 'sessions_used',
    });

    if (error) {
        throw new Error(`Failed to decrement sessions: ${error.message}`);
    }
}

export async function incrementSessionsUsed(userId: string) {
    const { error } = await supabase.rpc('increment_column', {
        user_id: userId,
        column_name: 'sessions_used' // match this with your SQL function parameter name
    });

    if (error) {
        throw new Error(`Failed to increment sessions: ${error.message}`);
    }
}

export async function incrementGroupsUsed(userId: string) {
    const { error } = await supabase.rpc('increment_column', {
        user_id: userId,
        column_name: 'groups_used'  // make sure this matches your function definition
    });

    if (error) {
        throw new Error(`Failed to increment groups: ${error.message}`);
    }
}

// ========== SESSIONS ==========

export async function saveSessionToSupabase(name: string, tabs: Tab[]): Promise<'success' | 'duplicate' | 'error'> {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) return 'error';

    const { error } = await supabase.from('sessions').insert([
        {
            user_id: userId,
            name,
            tabs,
        },
    ]);

    if (error) {
        if (error.message.includes('duplicate key')) {
            return 'duplicate';
        }
        console.error('[saveSessionToSupabase] Insert failed:', error.message);
        return 'error';
    }

    return 'success';
}

export async function getAllSessionsFromSupabase(): Promise<SavedSession[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function deleteSessionFromSupabase(name: string, userId: string): Promise<'deleted' | 'not_found'> {
    const { error, count } = await supabase
        .from('sessions')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .eq('name', name);

    if (error) throw new Error(error.message);

    return count && count > 0 ? 'deleted' : 'not_found';
}

// ========== GROUPS ==========

export async function saveGroupToSupabase(name: string, tabs: Tab[]): Promise<'success' | 'duplicate' | 'error'> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return 'error';

    // Add fallback IDs if not present
    const normalizedTabs = tabs.map((tab, index) => ({
        ...tab,
        id: tab.id ?? index,
    }));

    const { error } = await supabase.from('groups').insert([
        {
            user_id: user.data.user.id,
            name,
            tabs: normalizedTabs,
        },
    ]);

    if (error) {
        if (error.message.includes('duplicate key')) {
            return 'duplicate';
        }
        return 'error';
    }

    return 'success';
}


export async function getAllGroupsFromSupabase(): Promise<TabGroup[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function deleteGroupFromSupabase(groupName: string, userId: string) {
    const { error } = await supabase
        .from('groups')
        .delete()
        .eq('name', groupName)
        .eq('user_id', userId);

    if (error) {
        console.error('[deleteGroupFromSupabase] Error:', error.message);
        throw new Error(`Failed to delete group: ${error.message}`);
    }
}

export async function removeTabFromSupabaseGroup(groupName: string, tabId: number): Promise<void> {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const { data: group, error } = await supabase
        .from('groups')
        .select('tabs')
        .eq('user_id', userId)
        .eq('name', groupName)
        .single();

    if (error || !group) throw new Error('Group not found');

    const updatedTabs = group.tabs.filter((tab: Tab) => tab.id !== tabId);

    const { error: updateError } = await supabase
        .from('groups')
        .update({ tabs: updatedTabs })
        .eq('user_id', userId)
        .eq('name', groupName);

    if (updateError) throw new Error(`Failed to update group: ${updateError.message}`);
}

export async function renameSupabaseGroup(oldName: string, newName: string): Promise<void> {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Prevent overwriting another group
    const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id')
        .eq('user_id', userId)
        .eq('name', newName)
        .single();

    if (existingGroup && !checkError) {
        throw new Error('A group with that name already exists.');
    }

    const { error } = await supabase
        .from('groups')
        .update({ name: newName })
        .eq('user_id', userId)
        .eq('name', oldName);

    if (error) throw new Error(`Failed to rename group: ${error.message}`);
}


