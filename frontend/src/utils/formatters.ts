import { format } from 'date-fns';

export function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  });
  return formatter.format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'MMM dd, yyyy');
}

// HUMAN ASSISTANCE NEEDED
// Please review the date format and adjust if necessary based on project requirements
// Consider adding error handling for invalid date strings

export function truncateAddress(address: string, length: number): string {
  if (address.length > length * 2) {
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }
  return address;
}