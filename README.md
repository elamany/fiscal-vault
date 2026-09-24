# 🏦 FiscalVault

**A secure, scalable, and feature-rich multi-tenant e-commerce and invoicing platform built for modern businesses.**

FiscalVault empowers business owners to manage their storefronts, products, and orders seamlessly, while providing customers with a fast, intuitive, and secure shopping experience.

---

## 🛠️ Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql)
![React Query](https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=reactquery)
![Zustand](https://img.shields.io/badge/Zustand-State_Management-704e9a?style=for-the-badge)
![Resend](https://img.shields.io/badge/Resend-Email_API-000000?style=for-the-badge&logo=resend)
![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1?style=for-the-badge)

*(Note: If your architecture also includes Django/Flutter as a mobile app or separate backend, you can easily add those badges back in!)*

---

## ✨ Key Features

### 🏢 Multi-Tenant Architecture
- Dynamic storefronts accessible via unique, memorable slugs (e.g., `/store/your-brand`).
- Strict data isolation ensuring business owners only access their own products and orders.

### 🛒 Smart Cart Synchronization
- **Optimistic UI**: Instant cart updates without waiting for server responses.
- **Seamless Merge**: Guest cart items automatically merge with the user's database cart upon login (with intelligent quantity resolution).
- **Auto-Cleanup**: Cart state securely resets on logout.

### 🔐 Enterprise-Grade Security
- **OTP Email Verification**: Secure email changes via 6-digit codes with Resend integration.
- **Brute-Force Protection**: Strict 6-attempt limits and 2-minute cooldowns on OTP requests.
- **Real-Time Password Validation**: Frontend and backend synchronized rules (length, uppercase, lowercase, numbers) with live visual feedback.
- **Session Management**: Password changes automatically revoke all active refresh tokens.

### 📦 Advanced Product Management
- Rich-text HTML product descriptions with overflow-safe rendering.
- Multi-image uploads with drag-and-drop reordering and "main image" selection.
- Real-time stock tracking with visual indicators (In Stock, Low Stock, Out of Stock).

### ⚡ High Performance & UX
- Debounced, autocomplete-powered search with keyboard navigation.
- Infinite pagination for smooth product browsing.
- Server-Side Rendering (SSR) and React Query caching for lightning-fast page loads.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Resend API Key (for email features)

### Installation

1. **Clone the repository**
   ```bash
    git clone https://github.com/elamany/fiscal-vault.git
    cd fiscal-vault
   ```
2. **Install dependencies**
   ```bash
    npm install
    # or yarn install / pnpm install
   ```
3. **Set up environment variables**
Create a `.env` file in the root directory:
    ```bash
    JWT_ACCESS_SECRET="super-secret-access-key"
    JWT_REFRESH_SECRET="super-secret-refresh-key"

    # --- Upstash Redis ---
    UPSTASH_REDIS_REST_URL="your UPSTASH_REDIS_REST_URL"
    UPSTASH_REDIS_REST_TOKEN="your UPSTASH_REDIS_REST_TOKEN"

    # --- Chapa Payment Gateway ---
    CHAPA_SECRET_KEY="CHASECK_TEST-xxxxx"
    CHAPA_WEBHOOK_SECRET="ChapaWebhookxxxxxx"
    CHAPA_CALLBACK_URL="http://url-to-your/payment/success"

    #RESEND_API_KEY
    RESEND_API_KEY="re_xxx resend api key"

    # --- Supabase Storage ---
    SUPABASE_URL="your SUPABASE_URL"
    SUPABASE_ANON_KEY="your SUPABASE_ANON_KEY"

    # --- App Config ---
    NEXT_PUBLIC_APP_URL="http://localhost:3001 or running port"
    ```
4. **Initialize the database**
    ```bash
    npx prisma generate
    npx prisma db push # or npx prisma migrate dev
    ```
4. **Start the development server**
    ```bash
   npm run dev
   ```

---

**Built with ❤️ by Aman @elamany**  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/elamani/)
[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=google-chrome&logoColor=white)](https://my-portfolio-neon-mu-28.vercel.app/)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:ammanuael@gmail.com)

