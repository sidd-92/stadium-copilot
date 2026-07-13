import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Fans normally land on /menu/:standId directly via QR scan. This page
// exists for demo/dev convenience — manually jumping to a stand without a
// physical QR code to scan.
export function HomePage() {
  const [standId, setStandId] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (standId.trim()) navigate(`/menu/${encodeURIComponent(standId.trim())}`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Stadium Copilot</CardTitle>
          <CardDescription>Scan the QR code at a food stand to view its menu and order.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={standId}
              onChange={(e) => setStandId(e.target.value)}
              placeholder="Or enter a stand ID"
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit">Go</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
