/**
 * Pure unit checks for build-version comparison and reconnect backoff.
 * Run: npx tsx test/update-test.ts
 */
import { reconnectDelayMs, shouldOfferUpdate } from "../client/src/net/update";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log("  ok ", name);
  else {
    failed++;
    console.error("  FAIL", name, detail);
  }
}

console.log("update detection");
check("same versions stay quiet", shouldOfferUpdate("round15-incense-queue-20261113", "round15-incense-queue-20261113") === false);
check("different server version offers a refresh", shouldOfferUpdate("round14-daylight-20261113", "round15-incense-queue-20261113") === true);
check("empty client does not banner", shouldOfferUpdate("", "round15") === false);
check("empty server does not banner", shouldOfferUpdate("round15", "") === false);
check("whitespace is trimmed", shouldOfferUpdate("  a  ", "a") === false);

console.log("reconnect backoff");
check("first attempt is 1s", reconnectDelayMs(0) === 1000);
check("second is 2s", reconnectDelayMs(1) === 2000);
check("third is 4s", reconnectDelayMs(2) === 4000);
check("caps at 15s", reconnectDelayMs(10) === 15000);
check("negative attempt treated as 0", reconnectDelayMs(-3) === 1000);

console.log("done");
if (failed) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("all update checks passed");
