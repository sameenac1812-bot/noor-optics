# Noor Optics – Vercel & Supabase Setup Guide

This guide walks you through connecting your **Supabase** cloud database and deploying **Noor Optics** to **Vercel**.

---

## 1. Supabase Cloud Setup (Database & Real-Time Sync)

### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **"New Project"**.
3. Choose a name (e.g. `noor-optics`) and set a strong database password.

### Step 2: Run the Schema & Seed Data
1. In your Supabase Dashboard, open the **SQL Editor** (icon on the left navigation bar).
2. Click **"New Query"**.
3. Open [`supabase_schema.sql`](file:///c:/Users/atibo/OneDrive/Documents/noor%20opticals/supabase_schema.sql) in this project, copy its entire contents, and paste it into the Supabase SQL editor.
4. Click **Run** (or `Ctrl+Enter`).
5. This creates:
   - `products` table populated with all 18 curated Noor Optics frames.
   - `orders` table ready to capture customer checkouts, addresses, and prescriptions.
   - `newsletter_subscribers` table for email captures.
   - Row Level Security (RLS) policies allowing public browsing and order submissions.

### Step 3: Copy Your API Keys
1. In your Supabase Dashboard, go to **Project Settings** (gear icon) -> **API**.
2. Copy:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **Project API anon public key** (starts with `eyJ...`)

### Step 4: Connect the Keys to the Website
You have three convenient ways to connect your keys:
* **Option A (Instant in Browser / Console)**:
  Open your website in the browser, press `F12` (Developer Console), and run:
  ```javascript
  NoorSupabase.setCredentials('https://YOUR-PROJECT.supabase.co', 'YOUR-ANON-KEY');
  ```
  This immediately saves the connection in your browser and activates real-time syncing!
* **Option B (Direct in file)**:
  Open [`supabase.js`](file:///c:/Users/atibo/OneDrive/Documents/noor%20opticals/supabase.js) and paste your credentials into `DEFAULT_CONFIG`.
* **Option C (Environment Variables on Vercel)**:
  Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel project settings (see below).

---

## 2. Vercel Deployment

[`vercel.json`](file:///c:/Users/atibo/OneDrive/Documents/noor%20opticals/vercel.json) is already pre-configured with:
- Clean URLs (removes `.html` extensions).
- Long-term caching for product images (`Cache-Control: public, max-age=31536000, immutable`).
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

### Deploy via Vercel CLI:
In your terminal, run:
```bash
npx vercel
```
Follow the interactive prompts:
1. `Set up and deploy?` -> `y`
2. `Which scope?` -> Select your account
3. `Link to existing project?` -> `n`
4. `What's your project's name?` -> `noor-optics`
5. `In which directory is your code located?` -> `./`
6. `Want to modify settings?` -> `n`

Your project will deploy instantly and give you a live production URL (e.g. `https://noor-optics.vercel.app`)!

### Deploy via GitHub:
1. Push this repository to GitHub.
2. Go to [https://vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Click **Deploy**.

---

## 3. Verifying Cloud Functionality

1. **Place a Test Order**:
   - Add any frame to your bag and proceed to checkout.
   - Click **"Place Demonstration Order"**.
   - Your order receipt will display:
     `✓ Synced to Supabase Cloud (Table: orders · Ref: NOOR-XXXXXX)`.
   - In Supabase -> **Table Editor** -> **orders**, you will see your new order with customer name, prescription choice, items, and grand total.
2. **Test Newsletter**:
   - Scroll to the footer, enter an email in the **Noor Journal** box, and click **Join**.
   - In Supabase -> **Table Editor** -> **newsletter_subscribers**, the email will appear instantly.
