import { openDB } from 'idb';

const DB_NAME = 'finance-tracker-db';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: false
                });
                store.createIndex('date', 'date');
                store.createIndex('createdAt', 'createdAt');
            }
        }
    });
}

export async function addTransaction(transaction) {
    const db = await initDB();
    const tx = {
        ...transaction,
        id: transaction.id || Date.now().toString(),
        createdAt: new Date().toISOString()
    };
    await db.add(STORE_NAME, tx);
    return tx.id;
}

export async function updateTransaction(transaction) {
    const db = await initDB();
    await db.put(STORE_NAME, transaction);
}

export async function getTransactions() {
    const db = await initDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'date');
    // Sort descending by date
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getTransaction(id) {
    const db = await initDB();
    return db.get(STORE_NAME, id);
}

export async function deleteTransaction(id) {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
}

/**
 * Basic dashboard stats
 */
export async function getStats() {
    const transactions = await getTransactions();

    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

    let totalThisMonth = 0;
    let totalOverall = 0;
    const storeCounts = {};

    transactions.forEach(tx => {
        totalOverall += tx.total;
        if (tx.date.startsWith(currentMonth)) {
            totalThisMonth += tx.total;
        }

        // Store stats
        storeCounts[tx.store] = (storeCounts[tx.store] || 0) + 1;
    });

    // Top store
    let topStore = 'Belum ada';
    let maxCount = 0;
    for (const store in storeCounts) {
        if (storeCounts[store] > maxCount) {
            maxCount = storeCounts[store];
            topStore = store;
        }
    }

    return {
        totalThisMonth,
        totalOverall,
        topStore,
        transactionsCount: transactions.length
    };
}
