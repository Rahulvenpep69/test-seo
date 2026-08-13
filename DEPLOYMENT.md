# Deployment Guide: SEO Web App

This guide provides instructions for deploying the Anti-Gravity SEO Platform to various hosting environments.

## 📋 Prerequisites

- **Node.js**: v18 or later
- **Database**: MongoDB (Atlas or self-hosted)
- **Email**: Resend API key (for notifications)
- **Storage**: Cloudinary (for image uploads)
- **AI**: OpenAI API key (for SEO analysis features)
- **Payments**: Stripe and/or Razorpay accounts (optional)

---

## 🔐 Environment Variables

Create a `.env` file in the root directory. Use the following table as a reference:

| Variable | Description | Required |
| :--- | :--- | :---: |
| `DATABASE_URL` | MongoDB connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for auth (generate with `openssl rand -base64 32`) | Yes |
| `NEXTAUTH_URL` | The base URL of your application | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | No |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret | No |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |
| `RESEND_API_KEY` | Resend API key for emails | Yes |
| `CLOUDINARY_CLOUD_NAME`| Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET`| Cloudinary API secret | Yes |
| `STRIPE_SECRET_KEY` | Stripe Secret Key | No |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | No |

---

## 🚀 Deployment Platforms

### 1. Vercel (Recommended)
Vercel is the easiest way to deploy Next.js apps.

1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Port the project to Vercel.
3. Add all environment variables in the Vercel dashboard.
4. Set the build command to: `npx prisma generate && next build`.
5. Deploy!

### 2. Netlify
The project includes a `netlify.toml` file configured for Netlify.

1. Connect your repository to Netlify.
2. The `netlify.toml` will automatically handle the build and functions.
3. Add your environment variables in Site settings > Environment variables.
4. Deploy!

### 3. VPS (Ubuntu/Debian) - Docker
The most scalable and reproducible way to self-host.

1. **Install Docker & Docker Compose** on your server.
2. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd seo-web-app
   ```
3. **Create `.env` file** with your production values.
4. **Build and Start**:
   ```bash
   docker-compose up -d --build
   ```

### 4. VPS (Manual Setup with PM2)
If you prefer running Node.js directly on the server.

1. **Install Node.js, NPM, and PM2**:
   ```bash
   sudo apt update
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```
2. **Clone and Install**:
   ```bash
   git clone <your-repo-url>
   cd seo-web-app
   npm install
   ```
3. **Run Prisma Migrations**:
   ```bash
   npx prisma db push
   ```
4. **Build the App**:
   ```bash
   npm run build
   ```
5. **Start with PM2**:
   ```bash
   pm2 start npm --name "seo-app" -- start
   pm2 save
   pm2 startup
   ```

---

## 🛠️ Post-Deployment

### Database Migrations
Always run `npx prisma generate` and `npx prisma db push` after updating the schema.

### Cron Jobs
The SEO crawler needs periodic triggers. If using Vercel, the `vercel.json` handles this. For VPS, add a crontab entry:
```bash
# Run every day at midnight
0 0 * * * curl -X GET https://yourdomain.com/api/cron/crawl
```

### SSL (Nginx Reverse Proxy)
For VPS deployments, use Nginx with Certbot for SSL:
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
