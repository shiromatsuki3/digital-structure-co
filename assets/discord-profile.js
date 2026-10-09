/* Shared Discord identity refresh. Provider credentials stay in the auth session. */
window.DiscordProfile = (() => {
  let busy = false, nextCheck = 0;
  function identity(user) {
    const m = user.user_metadata || {};
    return {
      username: m.preferred_username || m.user_name || m.name || 'User',
      display_name: m.full_name || m.name || m.preferred_username || m.user_name || 'User',
      avatar_url: m.avatar_url || '',
      discord_id: m.provider_id || m.sub || null
    };
  }
  async function load(sb, session, freshLogin = false) {
    const user = session?.user;
    if (!user) return null;
    const { data: existing, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) return null;
    if (existing && !freshLogin) return existing;
    const fields = identity(user);
    if (existing) {
      const changed = Object.keys(fields).some(k => fields[k] !== existing[k]);
      if (!changed) return existing;
      const { data } = await sb.from('profiles').update(fields).eq('id', user.id).select().maybeSingle();
      return data || existing;
    }
    const { data } = await sb.from('profiles').insert({ id: user.id, ...fields, is_admin: false }).select().single();
    return data;
  }
  function watch(sb, apply) {
    async function refresh() {
      if (busy || document.hidden || Date.now() < nextCheck) return;
      busy = true;
      nextCheck = Date.now() + 60000;
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.provider_token) return;
        const response = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bearer ${session.provider_token}` },
          cache: 'no-store', signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) nextCheck = Date.now() + 15 * 60000;
          if (response.status === 429) {
            const limit = await response.json();
            nextCheck = Date.now() + Math.max(60000, Number(limit.retry_after || 60) * 1000);
          }
          return;
        }
        const discord = await response.json();
        const expectedId = session.user.identities?.find(i => i.provider === 'discord')?.identity_data?.provider_id
          || identity(session.user).discord_id;
        if (!expectedId || String(discord.id) !== String(expectedId)) return;
        const defaultIndex = discord.discriminator && discord.discriminator !== '0'
          ? Number(discord.discriminator) % 5 : Number((BigInt(discord.id) >> 22n) % 6n);
        const fields = {
          username: discord.username,
          display_name: discord.global_name || discord.username,
          avatar_url: discord.avatar
            ? `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.${discord.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`,
          discord_id: discord.id
        };
        const { data: { session: active } } = await sb.auth.getSession();
        if (active?.user.id !== session.user.id) return;
        const { data: existing } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (!existing) return;
        if (Object.keys(fields).some(k => fields[k] !== existing[k])) {
          const { data, error } = await sb.from('profiles').update(fields).eq('id', session.user.id).select().maybeSingle();
          // Keep the visible identity current even if profile writes are restricted.
          apply(error || !data ? { ...existing, ...fields } : data);
        } else apply(existing);
      } catch {
        // Offline or expired provider sessions retain the last known profile.
      } finally { busy = false; }
    }
    const timer = setInterval(refresh, 60000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') { nextCheck = 0; setTimeout(refresh, 0); }
    });
    setTimeout(refresh, 0);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }
  return { load, watch };
})();
