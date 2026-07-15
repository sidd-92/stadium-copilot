import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import { LanguageProvider } from "@/lib/language";
import { T } from "@/lib/translations";
import type { OrderStatus } from "@/lib/types";

function renderStepper(status: OrderStatus) {
  return render(
    <LanguageProvider>
      <OrderStatusStepper status={status} />
    </LanguageProvider>,
  );
}

const STEPS: OrderStatus[] = ["placed", "confirmed", "preparing", "ready_for_pickup", "collected"];

const STEP_LABEL_KEY: Record<Exclude<OrderStatus, "disrupted">, string> = {
  placed: "orderPlaced",
  confirmed: "orderConfirmed",
  preparing: "orderPreparing",
  ready_for_pickup: "orderReady",
  collected: "orderCollected",
};

describe("OrderStatusStepper", () => {
  it("renders nothing for a disrupted order", () => {
    const { container } = renderStepper("disrupted");
    expect(container).toBeEmptyDOMElement();
  });

  it.each(STEPS)("renders every step label for status %s", (status) => {
    renderStepper(status);
    for (const step of STEPS) {
      expect(screen.getByText(T.en[STEP_LABEL_KEY[step]])).toBeInTheDocument();
    }
  });

  it.each(STEPS)("marks exactly the steps before the current one as done for status %s", (status) => {
    renderStepper(status);
    const currentIndex = STEPS.indexOf(status);

    // one "✓" per completed step, and no more
    const checks = screen.queryAllByText("✓");
    expect(checks).toHaveLength(currentIndex);
  });

  it("shows no completed steps for the first status (placed)", () => {
    renderStepper("placed");
    expect(screen.queryAllByText("✓")).toHaveLength(0);
  });

  it("shows all prior steps completed for the final status (collected)", () => {
    renderStepper("collected");
    expect(screen.queryAllByText("✓")).toHaveLength(STEPS.length - 1);
  });
});
