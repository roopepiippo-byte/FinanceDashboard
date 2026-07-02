# Contract: Data-Access Layer (repositories)

**Feature**: 001-finance-dashboard | **Phase**: 1

The only code that touches IndexedDB. Components and the Zustand store call these
repositories; they never open the DB directly. All money is integer cents. All
methods are async (Promise-returning). Signatures are the stable contract;
bodies live in `src/data/`.

```ts
// src/data/db.ts
openDB(): Promise<IDBPDatabase>            // idb; creates stores + indexes on upgrade

// src/data/repositories/transactions.ts
transactions.getAll(): Promise<Transaction[]>
transactions.getByDateRange(fromISO, toISO): Promise<Transaction[]>
transactions.bulkUpsert(txns: Transaction[]): Promise<void>   // dedup by id
transactions.delete(id: string): Promise<void>
transactions.deleteBySourceFile(fileId: string): Promise<void>
transactions.deleteAll(): Promise<void>

// src/data/repositories/importedFiles.ts
importedFiles.list(): Promise<ImportedFile[]>
importedFiles.add(file: ImportedFile): Promise<void>
importedFiles.remove(id: string): Promise<void>

// src/data/repositories/categoryMap.ts   (portable dataset)
categoryMap.getAll(): Promise<CategoryMapEntry[]>
categoryMap.upsert(entry: CategoryMapEntry): Promise<void>
categoryMap.remove(pattern: string): Promise<void>
categoryMap.replaceAll(entries: CategoryMapEntry[]): Promise<void>  // import replace
categoryMap.clear(): Promise<void>

// src/data/repositories/overrides.ts
overrides.getAll(): Promise<Override[]>
overrides.set(o: Override): Promise<void>
overrides.remove(transactionId: string): Promise<void>

// src/data/repositories/budget.ts   (singleton)
budget.get(): Promise<Budget>
budget.save(b: Budget): Promise<void>

// src/data/repositories/categorySettings.ts + customCategories.ts (portable dataset)
categorySettings.getAll(): Promise<CategorySetting[]>
categorySettings.save(s: CategorySetting): Promise<void>
customCategories.getAll(): Promise<CustomCategory[]>
customCategories.add(c: CustomCategory): Promise<void>
customCategories.remove(name: string): Promise<void>

// src/data/repositories/wealth.ts
wealth.list(): Promise<WealthSnapshot[]>
wealth.upsert(s: WealthSnapshot): Promise<void>
wealth.remove(month: string): Promise<void>

// Danger zone (each behind a confirmation in the UI — FR-029)
resetAll(): Promise<void>  // clears every store
```

**Contract rules**:
- `bulkUpsert` MUST be idempotent on `id` (re-import creates no duplicates — FR-006).
- Reads return domain objects with money as integer cents; no formatting here.
- No method performs network I/O (Constitution Principle I).
- Category resolution (override → glob → uncategorized) is applied in the domain
  layer, not in the repositories.
