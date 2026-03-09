import { supabase } from './supabase.js';

/**
 * Get the currently logged-in user's ID
 */
async function getCurrentUserId() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');
    return session.user.id;
}

/**
 * Add a new transaction along with its item details.
 */
export async function addTransaction(transaction) {
    const userId = await getCurrentUserId();

    // 1. Insert into expenses table
    const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([{
            toko: transaction.store,
            total: transaction.total,
            date: transaction.date,
            user_id: userId
        }])
        .select('id')
        .single();

    if (expenseError) {
        console.error('Error adding expense:', expenseError);
        throw expenseError;
    }

    const expenseId = expenseData.id;

    // 2. Insert into detail_expenses table
    if (transaction.items && transaction.items.length > 0) {
        const detailItems = transaction.items.map(item => ({
            expense_id: expenseId,
            name: item.name,
            qty: item.qty || 1,
            price: item.price
        }));

        const { error: detailsError } = await supabase
            .from('detail_expenses')
            .insert(detailItems);

        if (detailsError) {
            console.error('Error adding detail items:', detailsError);
            throw detailsError;
        }
    }

    return expenseId;
}

/**
 * Update an existing transaction (Currently only supports updating the header)
 */
export async function updateTransaction(transaction) {
    // This is a simplified update that ONLY updates the main receipt info
    // A robust app would also delete and re-insert the detail items
    const { error } = await supabase
        .from('expenses')
        .update({
            toko: transaction.store,
            total: transaction.total,
            date: transaction.date
        })
        .eq('id', transaction.id);

    if (error) throw error;
}

/**
 * Fetch all transactions for the current user, along with their detail items
 */
export async function getTransactions() {
    const { data, error } = await supabase
        .from('expenses')
        .select(`
            id,
            toko,
            total,
            date,
            created_at,
            items:detail_expenses ( id, name, qty, price )
        `)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }

    // Map DB schema back to the frontend expected schema
    return data.map(dbRow => ({
        id: dbRow.id,
        store: dbRow.toko,
        total: Number(dbRow.total),
        date: dbRow.date,
        createdAt: dbRow.created_at,
        items: dbRow.items || []
    }));
}

/**
 * Get a specific transaction by ID
 */
export async function getTransaction(id) {
    const { data, error } = await supabase
        .from('expenses')
        .select(`
            id,
            toko,
            total,
            date,
            items:detail_expenses ( id, name, qty, price )
        `)
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }

    return {
        id: data.id,
        store: data.toko,
        total: Number(data.total),
        date: data.date,
        items: data.items || []
    };
}

/**
 * Delete a transaction structure (Deletes detail_expenses automatically due to ON DELETE CASCADE)
 */
export async function deleteTransaction(id) {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Calculate dashboard stats directly from fetched transactions.
 * (In a massive production app we would write a SQL RPC function to sum this on the backend)
 */
export async function getStats() {
    let transactions = [];
    try {
        transactions = await getTransactions();
    } catch (err) {
        // Silently fail auth fetching on init
        console.warn("Could not fetch stats yet (user likely not logged in).");
        return { totalThisMonth: 0, totalOverall: 0, topStore: '-', transactionsCount: 0 };
    }

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

        storeCounts[tx.store] = (storeCounts[tx.store] || 0) + 1;
    });

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
