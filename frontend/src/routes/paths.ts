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
  productDetailPattern: "/products/:id",
} as const;
