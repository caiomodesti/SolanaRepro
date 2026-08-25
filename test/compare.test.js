import test from "node:test";
import assert from "node:assert/strict";
import { canonicalError, canonicalReturnData, logSimilarity } from "../src/compare.js";
import { encodeBase58 } from "../src/base58.js";

test("canonicalizes custom instruction errors from RPC and LiteSVM", () => {
  const rpc = { InstructionError: [2, { Custom: 6001 }] };
  assert.equal(canonicalError(rpc), canonicalError("InstructionError(2, Custom(6001))"));
});

test("log similarity is deterministic LCS Dice similarity", () => {
  assert.equal(logSimilarity(["a", "b"], ["a", "b"]), 1);
  assert.equal(logSimilarity([], []), 1);
  assert.equal(logSimilarity(["a", "b"], ["a", "x"]), 0.5);
});

test("canonicalizes rent errors emitted by RPC and LiteSVM", () => {
  assert.equal(
    canonicalError({ InsufficientFundsForRent: { account_index: 0 } }),
    canonicalError("InsufficientFundsForRent { account_index: 0 }")
  );
});

test("encodes the all-zero system program address without web3.js", () => {
  assert.equal(encodeBase58(Buffer.alloc(32)), "11111111111111111111111111111111");
});

test("normalizes RPC and replay return-data shapes", () => {
  assert.deepEqual(
    canonicalReturnData({ programId: "Program", data: ["AQI=", "base64"] }),
    canonicalReturnData({ programId: "Program", dataBase64: "AQI=" })
  );
});
