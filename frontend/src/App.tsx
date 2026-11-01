import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, SiteLayout } from "./components/Layout";
import Appointments from "./pages/Appointments";
import { AuthPage, PasswordPage } from "./pages/AuthPages";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import MyProperties from "./pages/MyProperties";
import { About, Contact, NotFound } from "./pages/StaticPages";
import Profile from "./pages/Profile";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyEditor from "./pages/PropertyEditor";

function Private({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route element={<SiteLayout />}>
      <Route index element={<Home />} />
      <Route path="properties" element={<Properties />} />
      <Route path="properties/:id" element={<PropertyDetail />} />
      <Route path="about" element={<About />} />
      <Route path="contact" element={<Contact />} />
      <Route path="dashboard" element={<Private><Dashboard /></Private>} />
      <Route path="my-properties" element={<Private><MyProperties /></Private>} />
      <Route path="properties/new" element={<Private><PropertyEditor /></Private>} />
      <Route path="properties/:id/edit" element={<Private><PropertyEditor /></Private>} />
      <Route path="my-appointments" element={<Appointments />} />
      <Route path="incoming-requests" element={<Private><Appointments incoming /></Private>} />
      <Route path="profile" element={<Private><Profile /></Private>} />
      <Route path="*" element={<NotFound />} />
    </Route>
    <Route path="login" element={<AuthPage mode="login" />} />
    <Route path="register" element={<AuthPage mode="register" />} />
    <Route path="forgot-password" element={<PasswordPage mode="forgot" />} />
    <Route path="reset-password" element={<PasswordPage mode="reset" />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
} 
