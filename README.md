<p><img src="https://github.com/user-attachments/assets/d135f5bd-0e90-4b01-abca-0eb8dbabdecb" height="256" width="256" /></p>

# Canvas Task Manager (CTM)

A purpose-built calendar and deadline manager that integrates directly with Canvas LMS. I originally built this for myself, but figured it might be useful to other students.

**[Try it live →](https://ctm.andysu.tech/)**

![App Screenshot](https://github.com/user-attachments/assets/ecb75fb2-c134-4c8b-81ab-59a1fafa74b2)

## What is this?

Canvas Task Manager pulls assignments from Canvas LMS via their API and gives you a clean, filterable calendar view where you can actually _manage_ your work instead of stressing over deadlines.

Think of it as a layer between you and Canvas that lets you:

- **Filter the noise** - Systematically approve/reject assignments as they come in
- **Track progress** - Status assignments as incomplete → in progress → complete
- **Submit directly** - Submit assignments through CTM with verification checks to prevent ghost submissions
- **Cross-reference** - Link related assignments together using @mentions in notes

## Why does this exist?

Canvas's built-in calendar has two major problems:

1. **No status tracking** - You can't mark things as "in progress" or "complete." Every assignment is just there.
2. **No granular filtering** - If your course has messy assignment structures, you're stuck with all the noise. Every discussion post, every reading, every junk cluttering your view.

CTM fixes this by giving you an approval workflow: assignments come in, you decide what's actually worth tracking, and only _those_ show up on your calendar.

![Approval Flow](https://github.com/user-attachments/assets/85e6c390-e146-4419-b558-ac0625c79705)

## How it works

### Initial Setup

1. **Authentication** - Sign in using OAuth2 through Clerk (secure, no password management needed)
2. **Canvas Integration** - Add your Canvas URL and API token in Settings
3. **Fetch Assignments** - Hit the refresh button to pull assignments from Canvas

![Settings Modal](https://github.com/user-attachments/assets/553c5334-89fa-4426-bda3-54a655deff58)

### The Approval Workflow

When you fetch assignments, CTM shows them in a pending sidebar. For each assignment:

- **Review details** - See the full description, due date/time, assignment type, and points
- **Modify if needed** - Adjust the title, date, class, or notes before importing
- **Approve or Reject** - Accept it into your calendar or reject it (rejected items won't show up again)

![Pending Sidebar](https://github.com/user-attachments/assets/ffd7dbed-402a-4a82-8b86-a586d9d8150a)

This filters out the noise. If your professor posts 20 "optional reading" assignments, you can reject them all and focus on what actually matters.

### Managing Your Calendar

Once approved, assignments appear as events on your calendar:

- **Drag-and-drop** - Move events between days
- **Status tracking** - Click an event to mark it incomplete/in progress/complete
- **Color coding** - Events are colored by class for quick visual scanning
- **Filtering** - Toggle status filters (show/hide completed tasks) and class filters
- **Cross-referencing** - Use @mentions in the notes section to link related assignments
- **Direct submission** - Submit assignments directly from the event modal (with Canvas verification)

![Calendar View](https://github.com/user-attachments/assets/ee5b35b4-a78f-4518-96d4-3a6a4b3be331)

### Keyboard Shortcuts

- `Cmd/Ctrl + K` - Open Spotlight (Search)
- `Cmd/Ctrl + ,` - Open settings
- `Cmd/Ctrl + J` - Create new event
- `R` - Fetch Canvas Assignments
- Arrow keys - Navigate months

## Installation

### Prerequisites

- Node.js (v16+)
- Canvas LMS account with API access
- Clerk account for authentication (free tier works)

### Setup

```bash
# Clone the repo
git clone https://github.com/ansidian/Canvas-LMS-Task-Manager.git
cd Canvas-LMS-Task-Manager

# Install dependencies (both root and client)
npm run setup

# Initialize the database
npm run db:init

# Start development server
npm run dev
```

The app will run on `http://localhost:5173` (client) with the API server on `http://localhost:3001`.

### Environment Variables

You'll need `.env` files in two locations:

**Root directory (`.env`)** - For the server:

```env
# Required for Clerk authentication
CLERK_SECRET_KEY=your_clerk_secret_key

# Optional: For production deployment with Turso cloud database
TURSO_DATABASE_URL=your_turso_db_url
TURSO_AUTH_TOKEN=your_turso_auth_token
```

**Client directory (`client/.env`)** - For the frontend:

```env
# Required for Clerk authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

**Note:** For local development, CTM uses a local SQLite database at `server/db/canvas-tasks.db`. Turso environment variables are only needed for production deployments.

### Getting Your Canvas API Token

1. Log into Canvas
2. Go to Account → Settings
3. Scroll to "Approved Integrations"
4. Click "+ New Access Token"
5. Give it a name (e.g., "CTM") and generate
6. Copy the token and paste it into CTM's Settings modal

## Tech Stack

- **Frontend:** React 19, Vite, Mantine UI v8
- **Backend:** Express.js
- **Libraries** Framer Motion (transitions), Sonner (Toast Notifications), TipTap (Notes section), DnD Kit, Day.js, Tippy.js (for @mention).
- **Database:** LibSQL/Turso (SQLite-compatible)
- **Auth:** Clerk (OAuth2)
- **Deployment:** Render.com

## Frontend Architecture

The frontend was designed from the start to keep App lean and put state where it naturally belongs:

- **Contexts** own distinct state domains (events, UI state, filters, onboarding).
- **Hooks** package workflows like Canvas sync/reconcile/fetch and settings modal state.
- **Local storage** is intentionally limited to lightweight UI preferences (filters, onboarding status, last fetch timestamp, pending cache).

## Security Notes

- **Credential storage** - Canvas URL/token are saved in your user settings (database) and are not stored in localStorage
- **API proxying** - Canvas API calls are proxied through the backend to avoid CORS issues; the server uses your saved settings to authenticate requests
- **OAuth2 authentication** - Clerk handles all auth, so no password management needed
- **Submission verification** - Before submitting assignments, CTM verifies with Canvas to prevent ghost submissions

## Contributing

This is a personal project, but if you find bugs or have feature ideas, feel free to open an issue. Pull requests are welcome if you want to add something useful.

## FAQs

**Q: Will this work with my school's Canvas instance?**

A: As long as your school uses Canvas LMS and allows API access, yes. CTM uses the standard Canvas API.

**Q: Does this replace Canvas?**

A: No. It's a task management layer on top of Canvas. You still use Canvas for course content, announcements, etc.

**Q: What happens if I reject an assignment by mistake?**

A: Rejected items are stored in the database. Currently there is no way to restore rejected items without invoking 'Reset All Data' in Settings → Help.

**Q: Can I use this without Canvas?**

A: You can manually create events without connecting to Canvas, but the main value is in the Canvas integration.

**Q: Is my data private?**

A: Your Canvas API token is saved in your user settings in the database (local SQLite for development or Turso for production) and is not stored in localStorage. Assignment data (titles, descriptions, due dates, notes) is stored in the same database. All data is scoped to your Clerk user ID, so it's isolated per user.

---
