import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { BUILD_VERSION } from "../shared";

export class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("float32") x = 0;
  @type("float32") y = 0;
  @type("float32") z = 0;
  @type("float32") rotY = 0;
  @type("boolean") sitting = false;
  @type("int16") cushionId = -1;
  @type("uint8") look = 0;
  /** Burner id if currently in that burner's incense queue; else "". */
  @type("string") queueBurner = "";
  /** 0 = offering spot; -1 = not in a queue. */
  @type("int16") queueSlot = -1;
  /** See RITUAL_PHASE in shared.ts. 0 = none. */
  @type("uint8") ritualPhase = 0;
  /** Server Unix ms when the current incense ritual started; 0 if none. */
  @type("float64") ritualStartedAt = 0;
}

export class Incense extends Schema {
  @type("string") id = "";
  @type("string") by = "";
  @type("string") burnerId = "";
  @type("float32") x = 0;
  @type("float32") z = 0;
  /** Server-authoritative Unix ms when the stick was placed. Burns for INCENSE_DURATION_MS. */
  @type("float64") litAt = 0;
}

/** Single-file incense queue in front of one courtyard burner. */
export class BurnerQueue extends Schema {
  @type("string") burnerId = "";
  /** sessionIds, front (offering) first. */
  @type(["string"]) lineup = new ArraySchema<string>();
  /** sessionId currently performing the ritual, or "". */
  @type("string") ritualSid = "";
}

export class HallState extends Schema {
  @type("string") hallId = "courtyard";
  @type("string") buildVersion = BUILD_VERSION;
  @type({ map: Player }) players = new MapSchema<Player>();
  /** sessionId of occupant, or "" if empty. Empty in the courtyard. */
  @type(["string"]) cushions = new ArraySchema<string>();
  @type({ map: Incense }) incenses = new MapSchema<Incense>();
  @type({ map: BurnerQueue }) queues = new MapSchema<BurnerQueue>();
}

/** Back-compat alias. */
export class MainHallState extends HallState {}
