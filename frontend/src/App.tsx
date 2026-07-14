import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/language";
import { AppHeader } from "@/components/AppHeader";
import { HomePage } from "@/pages/HomePage";
import { MenuPage } from "@/pages/MenuPage";
import { OrderStatusPage } from "@/pages/OrderStatusPage";
import { MatchDetailPage } from "@/pages/MatchDetailPage";
import { StandOrdersPage } from "@/pages/StandOrdersPage";

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-[var(--sc-surface)]">
          <AppHeader />
          {/* min-w-0: this is a flex-column item, which defaults to
              min-width:auto (its content's intrinsic width). Without
              this, any intentionally-wide, horizontally-scrolling
              content inside a page (e.g. DietaryFilterBar's chip row)
              bubbles its width up and widens the whole document past
              the viewport instead of just scrolling internally. */}
          <div className="min-w-0 flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu/:standId" element={<MenuPage />} />
              <Route path="/orders/:orderId" element={<OrderStatusPage />} />
              <Route path="/matches/:matchId" element={<MatchDetailPage />} />
              <Route path="/stand/:standId/orders" element={<StandOrdersPage />} />
            </Routes>
          </div>
        </div>
        <Toaster />
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
