/**
 * Regression check for the password-reset resume race.
 * Run: node --experimental-strip-types scripts/check-request-resume.mjs
 */
import assert from "node:assert/strict";
import { RequestResume } from "../src/lib/requestResume.ts";

async function resolvesImmediately(resume) {
  let done = false;
  resume.wait().then(() => {
    done = true;
  });
  await Promise.resolve();
  assert.equal(done, true);
}

async function mailLinkIsNotCancelled() {
  const resume = new RequestResume();
  assert.equal(resume.onAppState("active").kind, "active");
  assert.equal(resume.onAppState("background").kind, "background");

  const exchange = { stale: false, id: "reset-link" };
  let released = false;
  const pending = resume.wait().then(() => {
    released = true;
  });
  resume.add(exchange);

  const decision = resume.onAppState("active");
  assert.equal(decision.kind, "resume");
  if (decision.kind !== "resume") return;
  assert.deepEqual(decision.abort, []);
  assert.equal(exchange.stale, false);
  await Promise.resolve();
  assert.equal(released, false);

  assert.equal(resume.settled(decision.token), true);
  await pending;
  assert.equal(released, true);
}

async function requestOpenAcrossBackgroundIsCancelled() {
  const resume = new RequestResume();
  resume.onAppState("active");
  const stalled = { stale: false, id: "stalled" };
  resume.add(stalled);
  resume.onAppState("background");
  const decision = resume.onAppState("active");
  assert.equal(decision.kind, "resume");
  if (decision.kind !== "resume") return;
  assert.deepEqual(
    decision.abort.map((request) => request.id),
    ["stalled"],
  );
  assert.equal(decision.abort.includes(stalled), true);
}

async function coldStartFromLinkIsNotAResume() {
  const resume = new RequestResume();
  assert.equal(resume.onAppState("background").kind, "ignore");
  const exchange = { stale: false, id: "cold-start" };
  resume.add(exchange);
  const decision = resume.onAppState("active");
  assert.equal(decision.kind, "active");
  assert.equal(exchange.stale, false);
  await resolvesImmediately(resume);
}

async function backgroundDuringDrainKeepsTheGateClosed() {
  const resume = new RequestResume();
  resume.onAppState("active");
  resume.onAppState("background");
  const first = resume.onAppState("active");
  assert.equal(first.kind, "resume");
  if (first.kind !== "resume") return;

  resume.onAppState("background");
  assert.equal(resume.settled(first.token), false);

  let released = false;
  const pending = resume.wait().then(() => {
    released = true;
  });
  await Promise.resolve();
  assert.equal(released, false);

  const second = resume.onAppState("active");
  assert.equal(second.kind, "resume");
  if (second.kind !== "resume") return;
  assert.equal(resume.settled(second.token), true);
  await pending;
  assert.equal(released, true);
}

async function requestLeftOpenIsCancelledOnTheNextResume() {
  const resume = new RequestResume();
  resume.onAppState("active");
  resume.onAppState("background");
  const decision = resume.onAppState("active");
  assert.equal(decision.kind, "resume");
  if (decision.kind !== "resume") return;
  resume.settled(decision.token);

  const exchange = { stale: false, id: "after-resume" };
  resume.add(exchange);
  resume.onAppState("background");
  const next = resume.onAppState("active");
  assert.equal(next.kind, "resume");
  if (next.kind !== "resume") return;
  assert.deepEqual(
    next.abort.map((request) => request.id),
    ["after-resume"],
  );
}

await resolvesImmediately(new RequestResume());
await mailLinkIsNotCancelled();
await requestOpenAcrossBackgroundIsCancelled();
await coldStartFromLinkIsNotAResume();
await backgroundDuringDrainKeepsTheGateClosed();
await requestLeftOpenIsCancelledOnTheNextResume();

console.log("request resume checks passed");
