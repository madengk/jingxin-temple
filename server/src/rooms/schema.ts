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
  @type("float32") x = 0;
  @type("float32") z = 0;
  @type("float64") litAt = 0;
}

export class MainHallState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  /** sessionId of occupant, or "" if empty */
  @type(["string"]) cushions = new ArraySchema<string>();
  @type({ map: Incense }) incenses = new MapSchema<Incense>();
}
