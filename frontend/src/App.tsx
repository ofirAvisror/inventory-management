import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PwaInstallBanner, PwaUpdater } from "./components/PwaUpdater";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductsListPage } from "./pages/ProductsListPage";
import { ProductsNewPage } from "./pages/ProductsNewPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { paths } from "./routes/paths";

function App() {
  return (
    <BrowserRouter>
      <PwaInstallBanner />
      <PwaUpdater />
      <Routes>
        <Route path={paths.login} element={<LoginPage />} />
        <Route path={paths.register} element={<RegisterPage />} />
        <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={paths.resetPassword} element={<ResetPasswordPage />} />
        <Route path={paths.verifyEmail} element={<VerifyEmailPage />} />

        <Route
          path={paths.products}
          element={
            <ProtectedRoute>
              <ProductsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={paths.productNew}
          element={
            <ProtectedRoute>
              <ProductsNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={paths.productDetailPattern}
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path={paths.home} element={<Navigate to={paths.products} replace />} />
        <Route path="*" element={<Navigate to={paths.products} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
