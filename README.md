# 💳 SalaryDetails – Personal Salary & Bonus Management Application

**SalaryDetails** is a modern, responsive full-stack web application designed for personal compensation and career trajectory management. It tracks monthly payroll slips, gross earnings, net take-home salary, promotion appraisal increments, performance & festival bonuses, company reimbursements, and certified non-overlapping career work experience.

---

## 🌟 Key Features

1. **Dynamic Dashboard**
   - **Summary KPI Cards**: Current Monthly Salary, Current Annual Salary, Total Earnings Received, Total Paid Bonuses, Total Increments Count & Value, Active Employer, and Certified Career Duration.
   - **5 Interactive Recharts Visualizations**:
     - *Monthly Salary Trend* (Gross vs. Take-Home vs. Deductions Area Chart)
     - *Yearly Total Earnings Breakdown* (Stacked Bar Chart: Salary + Bonuses + Other Income)
     - *Monthly Bonus Received* (Bar Chart)
     - *Salary Increment Progression History* (Line Chart)
     - *Annual Component Share* (Donut Chart: Basic vs. HRA vs. Allowances vs. Bonuses)
   - Dynamic Year and Month filtering.
   - Real-time MongoDB synchronization whenever records are added, edited, or deleted.

2. **Personal & Employment Details Form**
   - Maintain current employer, designation, department, joining date, and compensation structure.
   - **Automatic Live Experience Calculation**: Computes tenure in years, months, and days dynamically elapsed from your joining date.
   - Displays current company tenure, previous experience, and non-overlapping total career duration.
   - Complete `Save`, `Edit`, `Cancel`, and `Reset` workflows.

3. **Salary Management**
   - Complete payroll record tracking: Basic Salary, HRA, Other Allowances, Bonus in Payroll, Deductions.
   - **Automatic Gross & Net Calculation**: Auto-computes Gross Pay (`Basic + HRA + Allowances + Bonus`) and Take-Home Net (`Gross - Deductions`).
   - Distinguishes **Received** cash in bank from **Expected/Projected** amounts.
   - Accidental duplicate prevention for the same company, year, and month.
   - Current salary badge and identification.
   - **Bulk CSV Import & Export**: Download sample CSV template, preview parsed rows, check duplicate rows, and import with error logging.

4. **Salary Increment Management**
   - Track appraisals, promotions, and market adjustments.
   - **Auto-Calculated Metrics**:
     - $\text{Increment Amount} = \text{New Salary} - \text{Previous Salary}$
     - $\text{Increment Percentage} = \frac{\text{Increment Amount}}{\text{Previous Salary}} \times 100$
   - Handles zero previous salary safely.
   - Tracks cumulative monthly and annual raises.

5. **Bonus Management**
   - Record Performance, Annual, Festival, Joining, and Retention bonuses.
   - Tracks **Paid vs. Expected** bonuses separately.
   - Deduplication safeguard: avoids double-counting bonuses already included in payroll slips.
   - Peak bonus received and mean bonus metrics.
   - CSV export capability.

6. **Other Income & Deductions**
   - Track business travel reimbursements, medical allowances, wellness perks, and tax adjustments.
   - Net other income calculation.

7. **Reports & Financial Summaries**
   - **Financial Year (FY) Statement**: Default April 1 to March 31 tax year grouping (configurable in Settings).
   - **Calendar Year Statement**: Gross, Deductions, and Net Take-Home summaries.
   - **Company-Wise Comparison**: Compare earnings across different employers.
   - **Audited Career Earnings Standard**: Strictly calculates historical cash received without fictitious multiplication.
   - Print-ready view and CSV exports.

8. **Application Settings & MongoDB Backups**
   - Multi-currency switcher (INR `₹`, USD `$`, EUR `€`, GBP `£`, CAD `C$`, AUD `A$`, AED `AED`).
   - Financial year starting month configuration.
   - Dark Mode / Light Mode toggle.
   - Step-by-step Windows MongoDB backup and restore commands.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React Icons |
| **Data Visualization** | Recharts (ResponsiveContainer, AreaChart, BarChart, LineChart, PieChart) |
| **Backend** | Node.js, Express.js REST API |
| **Database** | MongoDB with Mongoose ODM |
| **Security** | bcrypt password hashing, JWT Bearer Token, Express Rate Limiter, CORS protection |
| **Data Processing** | JSON2CSV, CSV Parser, Date interval merge algorithm |

---

## 📁 Project Folder Structure

```text
paytrack/
├── package.json                 # Root script running frontend + backend concurrently
├── .gitignore                   # Ignore node_modules, .env, and build artifacts
├── README.md                    # Documentation & setup guide
├── server/                      # Node.js & Express REST API
│   ├── package.json
│   ├── .env.example             # Configurable environment template
│   ├── .env                     # Local environment settings (MONGODB_URI, PORT, etc.)
│   └── src/
│       ├── config/              # MongoDB connection (db.js)
│       ├── models/              # Mongoose schemas (User, Profile, Salary, Bonus, etc.)
│       ├── controllers/         # Business logic & aggregation pipelines
│       ├── middleware/          # JWT protect, error handler, rate limiter
│       ├── routes/              # Express API endpoints
│       ├── services/            # Date interval merge & experience service
│       ├── app.js               # Express application configuration
│       └── server.js            # Server entrypoint
└── client/                      # React.js Vite Frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js       # Tailwind palette & dark mode configuration
    ├── index.html
    └── src/
        ├── context/             # Auth, Theme, Settings, and Toast providers
        ├── services/            # API client with token & CSV handlers
        ├── utils/               # Currency, date, and experience formatters
        ├── components/          # Reusable UI (Navbar, Sidebar, StatCards, Modals)
        ├── pages/               # Dashboard, Profile, Salaries, Increments, Bonuses, Reports, Settings, Auth
        ├── App.jsx              # Main routing & application layout
        └── main.jsx
```

---

## ⚙️ Prerequisites on Windows

Ensure you have installed:
- **Node.js** (v18 or higher): Verify with `node -v`
- **npm**: Verify with `npm -v`
- **MongoDB**: Verify that the Windows MongoDB service is running on port `27017`

---

## 🚀 Installation & Setup (Step-by-Step)

### Step 1: Open PowerShell or Command Prompt
Navigate to the project root directory:
```powershell
cd e:\ReactJS\paytrack
```

### Step 2: Install Dependencies
Install dependencies for root, backend, and frontend:

```powershell
# In paytrack root:
npm install

# In server:
cd server
npm install

# In client:
cd ../client
npm install

# Return to root:
cd ..
```

---

## 🔐 Environment Configuration

The backend reads its configuration from `server/.env`.
Inspect or create `server/.env` based on `server/.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/paytrack
CLIENT_URL=http://localhost:5173
JWT_SECRET=paytrack_super_secure_jwt_secret_key_change_in_production_998877
JWT_EXPIRES_IN=30d
```

> **Note on Existing MongoDB Connection**:
> - If you have an existing MongoDB Atlas or custom MongoDB connection string, simply replace `MONGODB_URI` with your connection string.
> - PayTrack **never** drops existing databases or overwrites existing collections. It writes exclusively to its own dedicated collections (`users`, `employmentprofiles`, `salaryrecords`, `salaryincrements`, `bonuses`, `otherincomerecords`, `appsettings`, `employmenthistories`).

---

## 🏃 Running the Application

### Option A: Run Both Frontend and Backend Concurrently (Recommended)
From the root directory (`e:\ReactJS\paytrack`):
```powershell
npm run dev
```
This runs both the Express API and Vite React server concurrently.

### Option B: Run in Separate Terminal Windows

**Terminal 1 (Backend Server):**
```powershell
cd e:\ReactJS\paytrack\server
npm run dev
```
*Server runs at `http://localhost:5000`*

**Terminal 2 (Frontend Client):**
```powershell
cd e:\ReactJS\paytrack\client
npm run dev
```
*Vite dev server runs at `http://localhost:5173`*

---

## 🧪 Testing & Verifying Data in MongoDB

### 1. Instant 1-Click Access & Sample Data
1. Open your browser and navigate to: **`http://localhost:5173`**
2. On the login screen, click **"Instant 1-Click Demo Access"**.
3. This automatically creates an initial account and generates realistic sample records:
   - Current company: *Apex Cloud Technologies* (Senior Software Engineer)
   - 2 Years of monthly salary slips (2023 - 2024)
   - Annual appraisal and promotion increment records
   - Performance and festive Diwali bonuses
   - Non-overlapping career experience duration: *7+ years*

### 2. Verify Data Saved in MongoDB
You can verify the database records using `mongosh` or MongoDB Compass:

```powershell
# Open MongoDB Shell in PowerShell
mongosh

# Switch to the PayTrack database
use paytrack

# View collections created by PayTrack
show collections

# Verify your salary records
db.salaryrecords.find().pretty()

# Verify your bonus records
db.bonuses.find().pretty()

# Verify your increments
db.salaryincrements.find().pretty()
```

---

## 💾 MongoDB Database Backup & Restore Guide (Windows)

To protect your salary history and create offline backups, use the following Windows commands:

### Create a Database Backup (Dump)
Open Windows PowerShell or CMD:
```powershell
# Create a backup folder on your C: drive
mkdir C:\PayTrack_Backups -ErrorAction SilentlyContinue

# Export a full backup snapshot of the paytrack database
mongodump --db=paytrack --out="C:\PayTrack_Backups\backup_$(Get-Date -Format 'yyyyMMdd')"
```

### Restore from Backup Snapshot
```powershell
# Restore into paytrack database
mongorestore --db=paytrack "C:\PayTrack_Backups\<backup-folder-name>\paytrack"
```

---

## 🛡️ Security & Privacy Guarantees

- **Password Hashing**: Passwords are encrypted using `bcrypt` with salt rounds before being stored.
- **Data Isolation**: All MongoDB queries are scoped to `req.user.id`, ensuring private records cannot be accessed across accounts.
- **Environment Secrets**: Database credentials and JWT secrets reside exclusively in the server `.env` file and are never sent to the client bundle.
- **Duplicate Prevention**: Backend checks for duplicate salary records for the same employee, company, year, and month to prevent accidental duplicate entries.
#   S a l a r y D e t a i l s  
 