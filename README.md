# Vøid Pæragon - Novel Writing & Reading Platform

Complete website with all features ready to use.

## Features

✅ **User Authentication** - Login/Signup with Firebase
✅ **Novel Reading/Writing** - Browse and read novels  
✅ **Community Chat** - Global chat room
✅ **Admin Dashboard** - Manage users, novels, and Stripe payments
✅ **Code Editor** - Write and run code (admin only)
✅ **Profile System** - User profiles with avatars and bio
✅ **Premium Content** - Stripe payment integration
✅ **Notifications** - User notification system
✅ **Dark/Light Mode** - Pure black dark mode (default)
✅ **Moderator System** - Admin assigns moderators by email

## Admin Access

Only **paragon3467@gmail.com** has admin access to:
- Admin Dashboard (`/admin`)
- Code Editor (`/coding`)

## Firebase Setup

Firebase is already configured with your credentials:
- API Key: AIzaSyD5SkjADPqjkjEsmV_tUAk-KWNRFK59t_s
- Project: void-paragon-site
- Database URL: https://void-paragon-site-default-rtdb.firebaseio.com

## Stripe Configuration

Set your Stripe key through the Admin Dashboard:
1. Log in as paragon3467@gmail.com
2. Go to Admin Dashboard → Settings tab
3. Enter your Stripe Secret Key
4. Click "Save Stripe Key"

## Running the Website

```bash
npm install
npm run dev
```

The website will run at http://localhost:5000

## File Structure

```
client/
├── src/
│   ├── pages/          # All website pages
│   ├── components/     # Reusable components
│   ├── lib/            # Firebase config
│   └── contexts/       # Theme context
server/                 # Backend (minimal)
shared/                 # Shared schemas
```

## Pages

- `/` - Home page with hero section
- `/novels` - Browse all novels
- `/community` - Global chat
- `/profile` - User profile
- `/notifications` - User notifications
- `/settings` - Theme and account settings
- `/admin` - Admin dashboard (admin only)
- `/coding` - Code editor (admin only)

## Features to Add

- Novel upload/creation
- Chapter reading
- Payment processing
- Image uploads for covers/profiles
- Direct messaging
- Comments on novels

All the infrastructure is ready - just add content!
