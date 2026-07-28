import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import Assistant from "@/pages/Assistant";
import Marketplace from "@/pages/Marketplace";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";

export default function App() {
  return (
    <>
      <Routes>
        {/* 管理后台：独立全屏页面，不使用公开版式 */}
        <Route path="/admin" element={<Admin />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
