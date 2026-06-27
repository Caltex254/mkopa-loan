# MKOPA LOAN - Complete Digital Lending Platform

## Project Overview
MKOPA LOAN is a mobile-first digital lending platform built with Next.js 16, Tailwind CSS, and Prisma ORM. It features STK Push payment integration via Xdigitex Pay (Safaricom M-Pesa & Airtel Money), Cloudflare Tunnel support, and Pterodactyl deployment configuration.

## Tech Stack
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite) - easily switchable to PostgreSQL
- **Authentication**: JWT-based with bcrypt password hashing
- **Payments**: Xdigitex Pay API - STK Push (Safaricom M-Pesa & Airtel Money)
- **Deployment**: Docker + Cloudflare Tunnel + Pterodactyl

## Features
- 3-second splash screen with logo and branding
- Landing page with hero, calculator, benefits, testimonials, FAQ, contact
- User registration and login (no OTP required)
- KYC verification with document upload
- 8-step loan application workflow
- Custom loan amount editor (minimum KES 5,000)
- Auto-calculated fees and activation
- STK Push payment via Safaricom M-Pesa or Airtel Money
- Real-time payment status polling
- User dashboard with loan tracking
- Admin dashboard with KYC document download
- Cloudflare tunnel integration
- Pterodactyl panel deployment support

## Getting Started

### Prerequisites
- Node.js 18+ or Bun 1.0+
- npm or bun package manager

### Installation

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### Environment Variables

Create a `.env` file with:
```
DATABASE_URL=file:./db/custom.db
JWT_SECRET=your-secret-key-here
PAYMENT_API_KEY=pg_Q4LRdgtUxO3HWEYFuOUxvLf2cNDZYHtz
PAYMENT_BASE_URL=https://pay.xdigitex.space/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Build

```bash
bun run build
bun run start
```

## Payment Integration

The platform uses the Xdigitex Pay API for STK Push payments:

- **Safaricom M-Pesa**: Gateway = "safaricom"
- **Airtel Money**: Gateway = "airtel"  
- **Auto-Detect**: Gateway = "mobile" (auto-detects from phone number)

API Endpoint: `POST https://pay.xdigitex.space/api/payments/initiate`

## Cloudflare Tunnel

To expose the application via Cloudflare tunnel:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Run the tunnel
cloudflared tunnel run --token eyJhIjoiZDcwNTRjYzg3MjUxNTU2MzA1MDNlYzdkOTZjNmFjZmIiLCJ0IjoiODlhZDNkY2UtMTVjMS00MDlkLWExNjYtZWM5NmY4MDZjZDE1IiwicyI6Ik5UQmpaVGd5T0dZdE5HTTJaaTAwTUdVMUxUa3dZV1l0WVRWbFlURmhZVGt5TnpJeSJ9
```

Or use the startup script:
```bash
bash start-with-tunnel.sh
```

## Pterodactyl Deployment

### Option 1: Using the deployment script
```bash
PTERODACTYL_URL=https://your-panel.com node deploy.js
```

### Option 2: Manual deployment
1. Import the egg configuration from `pterodactyl-egg.sh`
2. Create a new server using the egg
3. Upload the project files
4. Start the server

### Option 3: Docker Compose
```bash
docker-compose up -d
```

## Loan Products

| Amount | Processing Fee | Activation Fee |
|--------|---------------|----------------|
| 5,000 | 299 | 299 |
| 10,000 | 599 | 299 |
| 20,000 | 1,199 | 299 |
| 50,000 | 2,999 | 299 |
| 100,000 | 5,999 | 299 |
| 200,000 | 11,999 | 299 |
| 500,000 | 29,999 | 299 |

Custom amounts above KES 5,000 are supported with auto-calculated fees.

## Default Admin Account

After seeding the database, an admin account is created:
- Email: admin@mkopaloan.com
- Password: admin123

⚠️ Change this password immediately after first login!

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeder
├── public/
│   └── logo.png           # MKOPA LOAN logo
├── src/
│   ├── app/
│   │   ├── api/           # REST API endpoints
│   │   │   ├── auth/      # Authentication
│   │   │   ├── kyc/       # KYC verification
│   │   │   ├── loans/     # Loan applications
│   │   │   ├── payments/  # Payment processing (STK Push)
│   │   │   ├── notifications/
│   │   │   └── admin/     # Admin endpoints
│   │   └── page.tsx       # Main application page
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── splash-screen.tsx
│   │   ├── landing.tsx
│   │   ├── auth/          # Login & Register
│   │   ├── kyc.tsx
│   │   ├── loan-application.tsx
│   │   ├── loan-success.tsx
│   │   ├── user-dashboard.tsx
│   │   ├── admin-dashboard.tsx
│   │   └── store.ts       # Zustand state management
│   └── lib/
│       ├── auth.ts        # JWT & password utilities
│       ├── db.ts          # Prisma client
│       ├── loans.ts       # Loan calculations
│       └── utils.ts       # Utility functions
├── Dockerfile             # Docker build configuration
├── docker-compose.yml     # Docker Compose with Cloudflare tunnel
├── cloudflared.yml        # Cloudflare tunnel config
├── start-with-tunnel.sh   # Startup script with tunnel
├── deploy.js              # Pterodactyl deployment script
├── deploy-pterodactyl.sh  # Alternative Pterodactyl deployment
└── pterodactyl-egg.sh     # Pterodactyl egg configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### KYC
- `POST /api/kyc` - Submit KYC documents
- `GET /api/kyc/[userId]` - Get KYC status

### Loans
- `POST /api/loans/apply` - Apply for a loan
- `GET /api/loans/my-applications` - Get user's loan applications
- `GET /api/loans/[applicationId]` - Get loan application details
- `GET /api/loans/products` - Get loan products

### Payments
- `POST /api/payments/activate` - Initiate STK Push activation payment
- `GET /api/payments/status` - Check payment status (polling)
- `GET /api/payments/callback` - Payment callback redirect
- `POST /api/payments/webhook` - Payment webhook receiver

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/[userId]` - Get user details
- `GET /api/admin/kyc` - List all KYC submissions
- `POST /api/admin/kyc/user/verify` - Verify/reject KYC
- `GET /api/admin/kyc/kyc/download` - Download KYC documents
- `GET /api/admin/applications` - List all loan applications
- `POST /api/admin/applications/[applicationId]/review` - Review application
- `GET /api/admin/payments` - List all payments
- `GET /api/admin/reports` - Get reports data
- `GET /api/admin/notifications` - List all notifications

## License
Proprietary - MKOPA LOAN
