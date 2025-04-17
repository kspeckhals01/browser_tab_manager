import { getAllLocalGroups, clearAllLocalGroups } from '../infrastructure/localTabStorage';
import { syncLocalGroupsToSupabase } from '../infrastructure/supabaseTabStorage';

export async function migrateLocalGroupsToCloud() {
    const localGroups = await getAllLocalGroups();
    if (localGroups.length > 0) {
        await syncLocalGroupsToSupabase(localGroups);
        await clearAllLocalGroups(); // You may need to create this if it doesn't exist yet
        console.log('Migrated local groups to Supabase and cleared local storage');
    }
}
