import test from "node:test";
import assert from "node:assert/strict";
import {
  importBanks,
  totals,
  accountBalance,
  filterTransactions,
  parseAmount,
  isStore,
  monthKey,
  banks,
} from "../src/lib/finance.ts";
const empty = () => ({
  version: 1,
  profile: { name: "Pessoa Demo", email: "demo@example.com" },
  banks: [],
  transactions: [],
  synced: "",
  complete: false,
});
test("importing a bank twice never duplicates transactions or balances", () => {
  const first = importBanks(empty(), ["aurora"]);
  const second = importBanks(first, ["aurora"]);
  assert.equal(second.transactions.length, first.transactions.length);
  assert.equal(second.banks.length, 1);
  assert.equal(
    accountBalance(second, "aurora"),
    accountBalance(first, "aurora"),
  );
});
test("bank connections contribute distinct data and cent-accurate balances", () => {
  const store = importBanks(empty(), ["aurora", "verde"]);
  assert.ok(store.transactions.some((t) => t.bank === "aurora"));
  assert.ok(store.transactions.some((t) => t.bank === "verde"));
  for (const id of store.banks) {
    assert.equal(
      accountBalance(store, id),
      banks.find((b) => b.id === id).opening +
        totals(store.transactions.filter((t) => t.bank === id)).net,
    );
    assert.ok(Number.isSafeInteger(accountBalance(store, id)));
  }
});
test("period, bank, category and search filters compose", () => {
  const store = importBanks(empty(), ["aurora", "verde"]);
  const month = monthKey(-1);
  const result = filterTransactions(store.transactions, {
    month,
    bank: "aurora",
    category: "Alimentação",
    query: "MERCADO",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].description, "Mercado da Vila");
  assert.equal(result[0].date.slice(0, 7), month);
  assert.equal(totals(result).expense, -result[0].amount);
});
test("amount entry accepts Brazilian decimals and rejects ambiguous or invalid inputs", () => {
  assert.equal(parseAmount("125,90"), 12590);
  assert.equal(parseAmount("0.01"), 1);
  assert.equal(parseAmount("10"), 1000);
  for (const v of ["0", "-5", "1.234,50", "12,345", "Infinity", "abc"])
    assert.equal(parseAmount(v), null);
});
test("persisted data validation tolerates empty accounts and rejects malformed payloads", () => {
  assert.ok(isStore(empty()));
  assert.ok(isStore({ ...empty(), complete: true }));
  assert.ok(!isStore({ version: 1 }));
  assert.ok(!isStore({ ...empty(), banks: ["unknown"] }));
  const store = importBanks(empty(), ["solar"]);
  assert.ok(isStore(JSON.parse(JSON.stringify(store))));
  assert.ok(
    !isStore({
      ...store,
      transactions: [{ ...store.transactions[0], amount: 1.5 }],
    }),
  );
});
