// One-off seed script for manual end-to-end verification. Not part of the
// service; run with `node seed-test-stand.mjs` against real ADC creds.
import { Firestore } from "@google-cloud/firestore";

const firestore = new Firestore({ projectId: "promptwars-502109" });

const stand = {
  stand_id: "test-stand-1",
  name: "Test Grill Corner",
  match_id: "test-match-1",
  status: "open",
  queue_length_estimate: 4,
  menu: [
    { item_id: "burger", name: "Veggie Burger", dietary_tags: ["vegan", "nut-free"], price: 8, in_stock: true },
    { item_id: "fries", name: "Fries", dietary_tags: ["vegan", "nut-free"], price: 4, in_stock: true },
    { item_id: "satay", name: "Peanut Satay", dietary_tags: ["vegan"], price: 7, in_stock: false },
  ],
};

await firestore.collection("stands").doc(stand.stand_id).set(stand);
console.log("Seeded stands/" + stand.stand_id);
