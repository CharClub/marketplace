import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";

export default function MainLayout() {
  return (
    <div>
      <Header />

      <main className="h-full min-h-[calc(100vh-56px)] pt-20">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
