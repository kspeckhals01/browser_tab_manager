import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserProfile } from '../../infrastructure/supabaseTabStorage';
import * as supabaseStorage from '../../infrastructure/supabaseTabStorage';
import * as localStorage from '../../infrastructure/localTabStorage';

export default function useGroupStorage() {
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const fetchTier = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                console.warn('User not authenticated or could not fetch user');
                setIsPro(false); // fallback to local
                return;
            }

            const profile = await getUserProfile(user.id);
            setIsPro(profile?.tier === 'pro');
        };

        fetchTier();
    }, []);

    return isPro ? supabaseStorage : localStorage;
}
