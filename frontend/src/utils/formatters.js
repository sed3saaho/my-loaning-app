export const formatKES = (amount) => {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val).replace('KES', 'KES ');
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

export const getStatusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'PARTIALLY_PAID':
      return { label: 'Partially Paid', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'MATURED':
      return { label: 'Matured', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'AWAITING_ROLLOVER':
      return { label: 'Awaiting Rollover', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'ROLLED_OVER':
      return { label: 'Rolled Over', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'FULLY_PAID':
      return { label: 'Fully Paid', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    case 'REVERSED':
      return { label: 'Reversed', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    default:
      return { label: status || 'Unknown', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(header => {
    let val = obj[header] === null || obj[header] === undefined ? '' : String(obj[header]);
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      val = `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }).join(','));

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

