'use client';

import { useEffect, useState } from 'react';

import { fetchMe } from '@/app/lib/api';

export default function useProfileHref() {
  const [profileHref, setProfileHref] = useState('/profile/camilo');

  useEffect(() => {
    const cachedUsername = localStorage.getItem('auth_username');
    if (cachedUsername) {
      setProfileHref(`/profile/${cachedUsername}`);
    }

    let isMounted = true;
    const loadProfile = async () => {
      try {
        const me = await fetchMe();
        if (!isMounted) {
          return;
        }
        if (me?.username) {
          setProfileHref(`/profile/${me.username}`);
          localStorage.setItem('auth_username', me.username);
        }
      } catch {
        // Keep cached/default profile route when auth is missing.
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  return profileHref;
}

