# NIHMS Backend — Deployment Guide (VPS / AWS / Azure)

## Prerequisites
- Ubuntu 22.04 VPS (2 vCPU, 4 GB RAM minimum)
- Node.js 18+
- MongoDB Atlas cluster (or self-hosted MongoDB 6+)
- Domain name with SSL certificate (Let's Encrypt recommended)

## 1. Clone & install
```bash
git clone https://github.com/your-org/nihms-backend.git
cd nihms-backend
npm install --production
```

## 2. Configure environment
```bash
cp .env.example .env
nano .env   # Fill in MONGO_URI, JWT_SECRET, SMTP creds, CLIENT_ORIGIN
```

## 3. Seed database
```bash
node seeds/seed.js
```

## 4. Run with PM2 (production process manager)
```bash
npm install -g pm2
pm2 start server.js --name nihms-api
pm2 save
pm2 startup   # Follow instructions to auto-start on reboot
```

## 5. Nginx reverse proxy (example)
```nginx
server {
    listen 443 ssl;
    server_name api.nihms.gov.za;

    ssl_certificate     /etc/letsencrypt/live/api.nihms.gov.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nihms.gov.za/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 6. Update frontend
In `js/api.js` set:
```js
const BASE_URL = 'https://api.nihms.gov.za/api/v1';
```

## API Endpoints Summary
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/register | Public | Register new user |
| POST | /api/v1/auth/login | Public | Login → JWT |
| POST | /api/v1/auth/refresh | Public | Refresh access token |
| POST | /api/v1/auth/logout | Auth | Invalidate session |
| POST | /api/v1/auth/forgot-password | Public | Send OTP |
| POST | /api/v1/auth/reset-password | Public | Set new password |
| GET | /api/v1/patients | Doctor/Nurse/Admin | List/search patients |
| POST | /api/v1/patients | Nurse/Doctor | Register patient |
| GET | /api/v1/appointments/queue | All | Live queue |
| POST | /api/v1/appointments | All | Book appointment |
| POST | /api/v1/prescriptions | Doctor | Create prescription |
| POST | /api/v1/prescriptions/:id/dispense | Pharmacy | Mark dispensed |
| GET | /api/v1/medications | All | Stock list |
| POST | /api/v1/labs | Doctor/Nurse | Create lab order |
| GET | /api/v1/analytics/overview | Admin/Doctor | National stats |
| GET | /api/v1/facilities | All | List facilities |
