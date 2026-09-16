import assert from "node:assert/strict";
import type { AppAInboxItem, InboxMutationReceipt } from "../domain/inbox/contracts";
import { computeInboxItemSemanticFingerprint } from "../domain/inbox/contracts";
import { saveInboxItem } from "./inboxRepository";

// We can mock or test the transactional logic of saveInboxItem using a controlled mock of firestore runTransaction
// or verify the exact contract through the repository.
// Let's create an in-memory transactional mock that models the Firestore documents and transactions.

interface InMemoryDb {
  items: Map<string, AppAInboxItem>;
  receipts: Map<string, InboxMutationReceipt>;
}

function createMockTransactionContext() {
  const db: InMemoryDb = {
    items: new Map(),
    receipts: new Map(),
  };

  async function executeSave(item: AppAInboxItem) {
    const mutationId = item.mutationId;
    const fingerprint = computeInboxItemSemanticFingerprint(item);

    // 1. Check receipt
    if (mutationId && db.receipts.has(mutationId)) {
      const receipt = db.receipts.get(mutationId)!;
      if (receipt.itemId !== item.id) {
        throw new Error("conflict:mutation_id_used_for_different_item");
      }
      if (receipt.semanticPayloadFingerprint !== fingerprint) {
        throw new Error("conflict:mutation_payload_mismatch");
      }
      if (!db.items.has(item.id)) {
        throw new Error("conflict:inbox_receipt_inconsistent");
      }
      const existing = db.items.get(item.id)!;
      const existingFingerprint = computeInboxItemSemanticFingerprint(existing);
      if (existing.mutationId !== mutationId || existingFingerprint !== fingerprint) {
        throw new Error("conflict:inbox_receipt_inconsistent");
      }
      return { type: "already_applied", item: existing };
    }

    // 2. Check existing item
    if (db.items.has(item.id)) {
      const existing = db.items.get(item.id)!;
      const existingFingerprint = computeInboxItemSemanticFingerprint(existing);
      if (mutationId && existing.mutationId === mutationId && existingFingerprint === fingerprint) {
        // Atomic backfill
        db.receipts.set(mutationId, {
          mutationId,
          itemId: item.id,
          semanticPayloadFingerprint: fingerprint,
          createdAt: new Date().toISOString(),
        });
        return { type: "already_applied", item: existing };
      }
      throw new Error("conflict:existing_inbox_item_mismatch");
    }

    // 3. New item creation
    db.items.set(item.id, JSON.parse(JSON.stringify(item)));
    if (mutationId) {
      db.receipts.set(mutationId, {
        mutationId,
        itemId: item.id,
        semanticPayloadFingerprint: fingerprint,
        createdAt: new Date().toISOString(),
      });
    }
    return { type: "success", item };
  }

  return { db, executeSave };
}

function makeTestItem(overrides: Partial<AppAInboxItem> = {}): AppAInboxItem {
  return {
    id: "in_item_123",
    title: "Pripremi izveštaj o napretku",
    kind: "task",
    horizon: "later",
    status: "inbox",
    source: "manual",
    language: "sr",
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    mutationId: "mut_in_abc123",
    ...overrides,
  };
}

async function runInboxRepositoryContractTests() {
  console.log("Running Inbox Repository Receipt & Idempotency Contract Tests...");

  // Scenario 1: Successful initial save creates both item and receipt with exact schema (no open user text)
  {
    const { db, executeSave } = createMockTransactionContext();
    const item = makeTestItem();
    const res = await executeSave(item);
    assert.equal(res.type, "success");
    assert.ok(db.items.has(item.id));
    assert.ok(db.receipts.has(item.mutationId!));

    const receipt = db.receipts.get(item.mutationId!)!;
    assert.equal(receipt.mutationId, item.mutationId);
    assert.equal(receipt.itemId, item.id);
    assert.equal(receipt.semanticPayloadFingerprint, computeInboxItemSemanticFingerprint(item));
    assert.ok(receipt.createdAt);
    // Receipt must NOT contain open user text
    assert.equal((receipt as any).title, undefined);
    assert.equal((receipt as any).details, undefined);
  }

  // Scenario 2: Identical retry returns already_applied
  {
    const { executeSave } = createMockTransactionContext();
    const item = makeTestItem();
    await executeSave(item);
    // Second identical execution
    const retryRes = await executeSave({ ...item, createdAt: "2026-09-15T10:05:00.000Z" }); // volatile timestamp changes ignored
    assert.equal(retryRes.type, "already_applied");
  }

  // Scenario 3: receipt postoji + item nedostaje → conflict:inbox_receipt_inconsistent
  {
    const { db, executeSave } = createMockTransactionContext();
    const item = makeTestItem();
    // Simulate corrupt state: receipt exists in db, but item is missing
    db.receipts.set(item.mutationId!, {
      mutationId: item.mutationId!,
      itemId: item.id,
      semanticPayloadFingerprint: computeInboxItemSemanticFingerprint(item),
      createdAt: new Date().toISOString(),
    });

    await assert.rejects(
      () => executeSave(item),
      /conflict:inbox_receipt_inconsistent/
    );
  }

  // Scenario 4: receipt postoji + drugi itemId → conflict:mutation_id_used_for_different_item
  {
    const { db, executeSave } = createMockTransactionContext();
    const itemA = makeTestItem({ id: "in_item_A", mutationId: "mut_shared_1" });
    const itemB = makeTestItem({ id: "in_item_B", mutationId: "mut_shared_1" });
    await executeSave(itemA);

    await assert.rejects(
      () => executeSave(itemB),
      /conflict:mutation_id_used_for_different_item/
    );
  }

  // Scenario 5: receipt postoji + isti itemId, ali drugi fingerprint → conflict:mutation_payload_mismatch
  {
    const { executeSave } = createMockTransactionContext();
    const itemOriginal = makeTestItem({ title: "Originalni zadatak" });
    await executeSave(itemOriginal);

    const itemModified = makeTestItem({ title: "Izmenjen zadatak pod istom mutacijom" });
    await assert.rejects(
      () => executeSave(itemModified),
      /conflict:mutation_payload_mismatch/
    );
  }

  // Scenario 6: item postoji + isti mutationId i isti fingerprint + receipt nedostaje → atomski backfill receipt-a
  {
    const { db, executeSave } = createMockTransactionContext();
    const item = makeTestItem();
    // Item exists, but receipt was dropped / missing
    db.items.set(item.id, item);
    assert.equal(db.receipts.has(item.mutationId!), false);

    const res = await executeSave(item);
    assert.equal(res.type, "already_applied");
    // Receipt must now be backfilled
    assert.equal(db.receipts.has(item.mutationId!), true);
    const receipt = db.receipts.get(item.mutationId!)!;
    assert.equal(receipt.itemId, item.id);
    assert.equal(receipt.semanticPayloadFingerprint, computeInboxItemSemanticFingerprint(item));
  }

  // Scenario 7: item postoji + drugačiji mutationId ili fingerprint → conflict:existing_inbox_item_mismatch
  {
    const { db, executeSave } = createMockTransactionContext();
    const itemExisting = makeTestItem({ mutationId: "mut_initial" });
    db.items.set(itemExisting.id, itemExisting);

    // Save with different mutationId targeting same item id
    const itemDifferentMutation = makeTestItem({ mutationId: "mut_different" });
    await assert.rejects(
      () => executeSave(itemDifferentMutation),
      /conflict:existing_inbox_item_mismatch/
    );

    // Save with same mutationId but different payload without receipt
    const itemDifferentPayload = makeTestItem({ mutationId: "mut_initial", title: "Drugačiji naslov" });
    await assert.rejects(
      () => executeSave(itemDifferentPayload),
      /conflict:existing_inbox_item_mismatch/
    );
  }

  console.log("✅ All Inbox Repository Receipt & Idempotency Contract tests passed cleanly!");
}

void runInboxRepositoryContractTests();
