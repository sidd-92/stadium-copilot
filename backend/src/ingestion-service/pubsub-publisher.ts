import { PubSub } from "@google-cloud/pubsub";
import type { MatchEvent } from "./types";

const TOPIC_NAME = process.env.MATCH_EVENTS_TOPIC ?? "match-events";

let pubsub: PubSub | null = null;

function getPubSub(): PubSub {
  if (!pubsub) {
    pubsub = new PubSub();
  }
  return pubsub;
}

// match_id and status are set as Pub/Sub message ATTRIBUTES (not just in
// the body) so downstream subscribers can filter on them without
// deserializing every message.
export async function publishMatchEvent(match: MatchEvent): Promise<void> {
  const topic = getPubSub().topic(TOPIC_NAME);
  await topic.publishMessage({
    data: Buffer.from(JSON.stringify(match)),
    attributes: {
      match_id: match.match_id,
      status: match.time_elapsed,
    },
  });
}
