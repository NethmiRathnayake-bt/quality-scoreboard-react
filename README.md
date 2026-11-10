# Quality Scoreboard (React + Node.js + MySQL)

Same system as the PHP version, rebuilt with a React front end.

    client/   React app (Vite)        - everything you see in the browser
    server/   Node.js + Express API   - talks to MySQL, checks logins, does the calculations
    sql/      database structure and starter data

React cannot talk to MySQL directly, so the Node server sits in the middle:
Browser (React)  <->  Node API (server/)  <->  MySQL

## 1. Database (one time)
1. Install XAMPP and start MySQL. (Apache is NOT needed for this version.)
2. phpMyAdmin -> Import (do not select a database) -> sql/01_structure.sql, then sql/02_starter_data.sql
   If you already imported them for the PHP version, skip this: the same database and the same logins work.
3. Login after import: admin / Admin@123 (change it under Accounts).

## 2. Install Node.js (one time)
Download the LTS version from https://nodejs.org and install it.

## 3. Run it while developing (two terminals)
Terminal 1 (API):
    cd server
    npm install
    npm run dev

Terminal 2 (React):
    cd client
    npm install
    npm run dev

Open http://localhost:5173

If your MySQL password or database name is different, edit server/.env
(JWT_SECRET should be changed to any long random text).

## 4. Run it for real use (one command)
    cd client
    npm install
    npm run build
    cd ../server
    npm install
    npm start

Open http://localhost:4000 (the Node server now serves the React app too).
Other computers on the same network can open http://<this-computer-ip>:4000

## What each user can do
- admin: everything
- auditor: score sheet, overview, leaderboard, analysis
- leader: only their own marks (daily + week by week) and the leaderboard.
  Leaders sign up on the sign-in page ("Join here") with their 6-digit employee number; an admin approves them under Accounts.

## Folder guide
server/src/index.js          starts the API
server/src/routes/auth.js    sign in, join
server/src/routes/data.js    overview, score sheet, leaderboard, analysis, my scores
server/src/routes/admin.js   team leaders, work cells, accounts
server/src/lib/ranking.js    weekly winner logic
client/src/App.jsx           page addresses (routes)
client/src/pages/            one file per page
client/src/components/       sidebar layout and the SVG charts
client/src/api.js            how React calls the API

## 5. Putting it online (so it works when your laptop is off)
The server needs these settings (Environment Variables on the hosting site, or server/.env):

    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME   from your online MySQL database
    DB_SSL=true                                       if the online database needs an encrypted connection
    JWT_SECRET                                        a long random text (never keep the default)
    PORT                                              the hosting site sets this itself

Build command : cd client && npm install && npm run build && cd ../server && npm install
Start command : cd server && npm start

The Node server serves the React app too, so ONE web service is enough.

## 6. Putting it on Vercel (frontend + API together, from GitHub)
The project already contains what Vercel needs: api/index.js, vercel.json and the root package.json.
1. Push the whole folder to a GitHub repository (do not upload server/.env).
2. vercel.com -> Add New -> Project -> import the repository. Leave "Root Directory" as the repository root.
3. Framework Preset: Other. (vercel.json sets "framework": null, which means Other, plus the build command and the output folder.)
   If you see "Cannot GET /" the project was treated as an Express app: set Framework Preset to Other in Settings > Build and Deployment, then Redeploy.
4. Environment Variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL=true, JWT_SECRET
5. Deploy. Vercel gives you a link such as https://your-project.vercel.app

You still need a MySQL database that is online (for example TiDB Cloud). Vercel does not host MySQL.
