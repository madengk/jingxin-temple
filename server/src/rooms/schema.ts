import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

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

export class HallState extends Schema {
  @type("string") hallId = "courtyard";
  @type({ map: Player }) players = new MapSchema<Player>();
  /** sessionId of occupant, or "" if empty. Empty in the courtyard. */
  @type(["string"]) cushions = new ArraySchema<string>();
  @type({ map: Incense }) incenses = new MapSchema<Incense>();
}

/** Back-compat alias. */
export class MainHallState extends HallState {}
