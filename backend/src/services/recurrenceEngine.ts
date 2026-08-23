import { query, inMemStore } from '../config/database';

export interface RecurrenceInsight {
  flat_number: string;
  category_id: string;
  category_name: string;
  recent_complaints_count: number;
  is_recurring: boolean;
  latest_complaint_date: Date;
}

export async function detectRecurrenceForFlatAndCategory(flatNumber: string, categoryId: string): Promise<RecurrenceInsight> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const res = await query(
      `SELECT c.id, c.created_at, cat.name as category_name
       FROM complaints c
       JOIN categories cat ON c.category_id = cat.id
       WHERE c.flat_number = $1
         AND c.category_id = $2
         AND c.created_at >= $3
       ORDER BY c.created_at DESC`,
      [flatNumber, categoryId, thirtyDaysAgo]
    );

    const count = res.rowCount || 0;
    const catName = res.rows[0]?.category_name || 'Maintenance';
    const latestDate = res.rows[0]?.created_at || new Date();

    return {
      flat_number: flatNumber,
      category_id: categoryId,
      category_name: catName,
      recent_complaints_count: count,
      is_recurring: count >= 3,
      latest_complaint_date: latestDate,
    };
  } catch (e) {
    const matching = inMemStore.complaints.filter(
      c => c.flat_number === flatNumber && c.category_id === categoryId && new Date(c.created_at) >= thirtyDaysAgo
    );
    const cat = inMemStore.categories.find(c => c.id === categoryId);

    return {
      flat_number: flatNumber,
      category_id: categoryId,
      category_name: cat ? cat.name : 'Maintenance',
      recent_complaints_count: matching.length,
      is_recurring: matching.length >= 3,
      latest_complaint_date: matching[0] ? new Date(matching[0].created_at) : new Date(),
    };
  }
}

export async function getAllRecurrenceInsights(): Promise<RecurrenceInsight[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const map = new Map<string, { flat: string; catId: string; catName: string; count: number; latest: Date }>();

  const list = inMemStore.complaints.filter(c => new Date(c.created_at) >= thirtyDaysAgo);
  for (const c of list) {
    const key = `${c.flat_number}:${c.category_id}`;
    const cat = inMemStore.categories.find(item => item.id === c.category_id);
    const catName = cat ? cat.name : 'Maintenance';
    const cDate = new Date(c.created_at);

    if (!map.has(key)) {
      map.set(key, { flat: c.flat_number, catId: c.category_id, catName, count: 1, latest: cDate });
    } else {
      const existing = map.get(key)!;
      existing.count += 1;
      if (cDate > existing.latest) existing.latest = cDate;
    }
  }

  const results: RecurrenceInsight[] = [];
  map.forEach(val => {
    results.push({
      flat_number: val.flat,
      category_id: val.catId,
      category_name: val.catName,
      recent_complaints_count: val.count,
      is_recurring: val.count >= 3,
      latest_complaint_date: val.latest,
    });
  });

  return results.filter(r => r.is_recurring);
}
