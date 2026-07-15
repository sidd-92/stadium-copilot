import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DisruptionAlert } from "@/components/DisruptionAlert";
import { LanguageProvider } from "@/lib/language";
import type { Order, MenuResponse } from "@/lib/types";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getMenu: vi.fn(),
}));

function menuResponse(overrides: Partial<MenuResponse> = {}): MenuResponse {
  return {
    stand_id: "stand-1",
    name: "Grill Stand",
    match_id: "match-1",
    status: "closed_incident",
    queue_length_estimate: 3,
    menu: [{ item_id: "burger", name: "Burger", dietary_tags: [], price: 8.5, in_stock: true }],
    summary: "",
    ...overrides,
  };
}

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    order_id: "order-1",
    match_id: "match-1",
    stand_id: "stand-1",
    items: [{ item_id: "burger", name: "Burger", quantity: 2, dietary_tags: [] }],
    status: "placed",
    disruption_reason: null,
    resolution: null,
    reassigned_to_stand_id: null,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}

function renderWithProviders(order: Order) {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <DisruptionAlert order={order} />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe("DisruptionAlert", () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders nothing when the order is not disrupted", () => {
    vi.mocked(api.getMenu).mockResolvedValue(menuResponse());

    const { container } = renderWithProviders(baseOrder({ status: "placed" }));

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the reassignment message and destination stand for a disrupted, reassigned order", async () => {
    vi.mocked(api.getMenu).mockImplementation((standId: string) =>
      Promise.resolve(
        standId === "stand-1"
          ? menuResponse({ stand_id: "stand-1", name: "Grill Stand" })
          : menuResponse({ stand_id: "stand-2", name: "Taco Stand" }),
      ),
    );

    const order = baseOrder({
      status: "disrupted",
      resolution: "reassigned",
      reassigned_to_stand_id: "stand-2",
    });

    renderWithProviders(order);

    expect(screen.getByText(/We've got you covered/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/has closed due to an incident\. Your order has been moved to/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Taco Stand\./)).toBeInTheDocument();
    });
    expect(screen.getAllByText("Taco Stand").length).toBeGreaterThan(0);
  });

  it("renders the refund message for a disrupted order with no reassignment", async () => {
    vi.mocked(api.getMenu).mockResolvedValue(menuResponse({ stand_id: "stand-1", name: "Grill Stand" }));

    const order = baseOrder({
      status: "disrupted",
      resolution: "refund_pending",
      reassigned_to_stand_id: null,
    });

    renderWithProviders(order);

    await waitFor(() => {
      expect(
        screen.getByText(/has closed due to an incident and no suitable alternate stand was found/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/Nearby Stands/i)).not.toBeInTheDocument();
  });
});
