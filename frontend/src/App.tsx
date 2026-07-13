import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { HomePage } from "@/pages/HomePage";
import { MenuPage } from "@/pages/MenuPage";
import { OrderStatusPage } from "@/pages/OrderStatusPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/menu/:standId" element={<MenuPage />} />
        <Route path="/orders/:orderId" element={<OrderStatusPage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
