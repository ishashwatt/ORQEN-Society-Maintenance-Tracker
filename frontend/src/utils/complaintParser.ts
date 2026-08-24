export interface ParsedComplaint {
  title: string;
  categoryName: string;
  description: string;
}

export function parseComplaintContent(rawDescription: string, defaultCategoryName?: string): ParsedComplaint {
  let title = '';
  let categoryName = (defaultCategoryName || '').trim();
  let cleanDesc = (rawDescription || '').trim();

  const isGenericCategory =
    !categoryName ||
    categoryName.toLowerCase().includes('other') ||
    categoryName.toLowerCase().includes('custom') ||
    categoryName.toLowerCase() === 'maintenance';

  // Extract [Category: ...] if present
  const catMatch = cleanDesc.match(/\[category:\s*([^\]]+)\]/i);
  if (catMatch) {
    categoryName = catMatch[1].trim();
    cleanDesc = cleanDesc.replace(catMatch[0], '').trim();
  }

  // Extract [Title: ...] if present
  const titleMatch = cleanDesc.match(/\[title:\s*([^\]]+)\]/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    cleanDesc = cleanDesc.replace(titleMatch[0], '').trim();
  }

  // Fallback: If no explicit [Title: ...] tag, split by newline or colon
  if (!title) {
    const lines = cleanDesc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      title = lines[0];
      cleanDesc = lines.slice(1).join('\n\n');
    } else {
      // Single long paragraph: check if there's a sentence/split
      const dotIndex = cleanDesc.indexOf('.');
      if (dotIndex > 15 && dotIndex < 100) {
        title = cleanDesc.substring(0, dotIndex).trim();
        cleanDesc = cleanDesc.substring(dotIndex + 1).trim();
      } else {
        title = cleanDesc;
      }
    }
  }

  // Capitalize category name nicely if lowercase
  if (categoryName) {
    categoryName = categoryName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return {
    title: title || 'Maintenance Request',
    categoryName: categoryName || (isGenericCategory ? 'General Maintenance' : defaultCategoryName || 'General'),
    description: cleanDesc || title,
  };
}
