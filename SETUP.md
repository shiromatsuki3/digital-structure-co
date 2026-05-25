# Digital Structure Co. — Review System Setup

## Step 1 — Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up free
2. Click **New Project** → name it `digital-structure-co`
3. Set a database password (save it) → click **Create project**
4. Wait ~2 min for it to spin up

---

## Step 2 — Run the Database Schema
1. In Supabase dashboard → **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste the entire contents of `supabase-setup.sql`
4. Click **Run**

---

## Step 3 — Create a Discord Application
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it `Digital Structure Co.`
3. Go to **OAuth2** tab
4. Add redirect URI:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   *(Replace `YOUR_PROJECT_REF` with your Supabase project reference ID)*
5. Save changes
6. Copy your **Client ID** and **Client Secret**

---

## Step 4 — Enable Discord OAuth in Supabase
1. In Supabase → **Authentication** → **Providers**
2. Find **Discord** → toggle **Enable**
3. Paste your **Client ID** and **Client Secret** from Step 3
4. Save

---

## Step 5 — Set Site URL in Supabase
1. Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   ```
   https://shiromatsuki3.github.io/digital-structure-co
   ```
3. Under **Redirect URLs**, add the same URL
4. Save

---

## Step 6 — Add Your Supabase Keys to index.html
1. In Supabase → **Settings** → **API**
2. Copy **Project URL** and **anon public** key
3. Open `index.html` and find these two lines near the bottom:
   ```js
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
4. Replace with your actual values

---

## Step 7 — Make Yourself Admin
1. Log in to your site with Discord (do this first to create your profile)
2. In Supabase → **Authentication** → **Users** → find your account → copy your **User UID**
3. In Supabase → **SQL Editor** → run:
   ```sql
   update public.profiles
   set is_admin = true
   where id = 'YOUR_USER_UID_HERE';
   ```
4. Refresh the site — you'll see the ⚙ admin button in the bottom right

---

## Done! 🎉

Your review system is now:
- ✅ Discord OAuth login
- ✅ One review per account
- ✅ Real-time updates
- ✅ Admin panel (pin, hide, delete)
- ✅ Star breakdown with live percentages
- ✅ Verified client badges
- ✅ Mobile responsive
