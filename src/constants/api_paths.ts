export const API_PATHS = {
  auth: {
    signup: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    verifyOtp: '/api/auth/verify-email',
    resendOtp: '/api/auth/resend-otp',
    forgotPassword: '/api/auth/forgot-password',
    verifyResetCode: '/api/auth/verify-reset-code',
    resetPassword: '/api/auth/reset-password',
  },
   products: {
    // Public endpoints
    all: '/api/products/public',
    byTenant: (slug: string) => `/api/products/public/tenant/${slug}`,
    byId: (id: string) => `/api/products/public/${id}`,
    
    // Business owner endpoints (protected)
    ownerList: '/api/products',
    ownerById: (id: string) => `/api/products/${id}`,
  },
  cart: {
    base: '/api/cart',
  },
  orders: {
    base: '/api/orders',
    byId: (id: string) => `/api/orders/${id}`,
  },
} as const;