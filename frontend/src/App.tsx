import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { paths } from "./routes/paths";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={paths.login} element={<LoginPage />} />
        <Route path={paths.register} element={<RegisterPage />} />
        <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={paths.resetPassword} element={<ResetPasswordPage />} />
        <Route path={paths.verifyEmail} element={<VerifyEmailPage />} />
        <Route path="*" element={<Navigate to={paths.login} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
