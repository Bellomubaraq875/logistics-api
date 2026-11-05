# Backend setup (NestJS + Prisma + Neon)

1. Copy `.env.example` to `.env` and fill in: DATABASE_URL, DIRECT_URL (Neon), JWT_SECRET (32+ chars),
   ADMIN_* (first Super Admin), and the SMTP_* values if you want password-reset emails.
2. Install and set up the database:

       npm install
       npx prisma generate
       npx prisma db push
       npm run seed

3. Run: `npm run dev`  (API at http://localhost:4000, health check at /)

Password reset emails: if SMTP_* is empty, the reset link is printed in this terminal instead (development only).
