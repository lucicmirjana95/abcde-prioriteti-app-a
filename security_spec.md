# Security Specification for ABCDE Priorities Collaboration Board

## 1. Data Invariants
- A shared board must have a unique alphanumeric identifier.
- Tasks are localized inside `/boards/{boardId}/tasks/{taskId}`, preventing leakage of tasks between different boards.
- All users (anonymous or authenticated) can create and interact with boards they have the Board ID for, allowing lightweight collaboration.
- Timestamps and identifiers must be verified during task modification.

## 2. The "Dirty Dozen" Payloads (Exploit Scenarios)
1. **Board Spoofing**: Attempting to write a board document with an ID belonging to another domain.
2. **Task Orphans**: Creating a task referencing a non-existent board.
3. **Cross-Talk injection**: Writing task updates to `board-A` using authentication coordinates associated with `board-B`.
4. **Invalid Categories**: Trying to inject a category value like `Z` or `omega` into a task.
5. **Overlong ID Poisoning**: Trying to write a task with a massive 2MB string ID to exhaust database quotas.
6. **Task Hijacking**: Sub-priority spoofing with negative numbers or non-sequential ranks.
7. **Negative/Bad Subpriority**: Setting subpriorities to negative values (e.g., `-100`).
8. **Immutability bypass**: Trying to alter the `createdTime` or the `id` of an existing task.
9. **Tampering System fields**: Falsely claiming an automatic AI suggestions tag `aiSuggested: true` to inject custom explanations.
10. **Unauthorized board deletions**: High-volume, non-admin deletes of active board entities.
11. **Malicious type coercion**: Supplying `done` as a string (`"yes"`) instead of a boolean.
12. **Timestamp spoofing**: Forging `createdAt` or `updatedAt` to look like a post-dated deadline.

## 3. Reference Security Rules Draft
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global safety limit
    match /{document=**} {
      allow read, write: if false;
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128;
    }

    match /boards/{boardId} {
      allow get, create, update: if isValidId(boardId);
      allow delete: if false;

      match /tasks/{taskId} {
        allow read, get, list: if isValidId(boardId) && isValidId(taskId);
        allow create, update, delete: if isValidId(boardId) && isValidId(taskId);
      }
    }
  }
}
```
