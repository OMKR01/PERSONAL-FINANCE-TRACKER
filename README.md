# Personal Finance Tracker
A full-stack web application designed to help individuals track income, 
categorize expenses, visualize cash flow, and manage monthly budgets through interactive dashboards.

# Features
Transaction Management: Log daily expenses and incomes with custom categories, dates, and payment methods.
Budgeting & Goals: Set monthly spending limits per category and track progress with dynamic progress indicators.
Interactive Analytics: Visual breakdowns of spending trends, category distributions, and net savings over time.
Data Filtering & Export: Filter transactions by date range, payment mode, or category; export data to CSV.
Secure Authentication: User signup, login, and session persistence using JWT/session tokens.

# Tech Stack
Frontend: React.js, Tailwind CSS, Lucide Icons, Chart.js / Recharts
Backend: Node.js, Express.js (or Python / FastAPI)
Database: PostgreSQL / MongoDB
Authentication: JSON Web Tokens (JWT) / bcrypt

# Prerequisites
Ensure you have the following installed on your local machine:
Node.js (v18.0.0 or higher)
npm (v9.0.0 or higher) or yarn
Git
Database Engine (e.g., PostgreSQL local instance or MongoDB URI)

# Environment Variables Configuration
# Backend (server/.env)
Create a .env file in the server directory and add the following:
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/finance_db
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:3000

# Frontend (client/.env)
Create a .env file in the client directory:
REACT_APP_API_BASE_URL=http://localhost:5000/api

# Installation & Setup
# 1. Clone the Repository
git clone https://github.com/OMKR01/personal-finance-tracker.git
cd personal-finance-tracker
# 2. Backend Setup
#Navigate to backend directory
cd server

#Install dependencies
npm install

#(Optional) Run database migrations/seeds if applicable
npm run db:migrate

#Start the development server
npm run dev
*** The server will start listening on http://localhost:5000.

# 3. Frontend Setup
Open a new terminal window:
#Navigate to frontend directory
cd client

#Install dependencies
npm install

#Start the frontend application
npm start or npm run dev
*** The client app should automatically open in your default browser at http://localhost:3000.

