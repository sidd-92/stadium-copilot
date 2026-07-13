import { Firestore } from "@google-cloud/firestore";

const firestore = new Firestore({ projectId: "promptwars-502109" });

const stand = {
  stand_id: "test-stand-2",
  name: "Test Veggie Corner",
  match_id: "test-match-1",
  status: "open",
  queue_length_estimate: 1, // lower than test-stand-1's 4, so it's a valid reassignment target
  menu: [
    { item_id: "wrap", name: "Veggie Wrap", dietary_tags: ["vegan", "nut-free"], price: 6, in_stock: true },
  ],
};

await firestore.collection("stands").doc(stand.stand_id).set(stand);
console.log("Seeded stands/" + stand.stand_id);
