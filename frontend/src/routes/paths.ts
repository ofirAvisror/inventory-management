// paths.ts
// This file contains the paths for the application.
// It is used to navigate between the pages of the application.
export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  products: "/products",
  productNew: "/products/new",
  productDetail: (id: string) => `/products/${id}`,
  productEdit: (id: string) => `/products/${id}?edit=1`,
  productDetailPattern: "/products/:id",
} as const;
