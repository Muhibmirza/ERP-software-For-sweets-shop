import dayjs from 'dayjs';

export const pkr = (value = 0) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value);

export const formatCurrency = pkr;

export const date = (value?: string | Date) => (value ? dayjs(value).format('DD MMM YYYY') : '-');

export const dateTime = (value?: string | Date) => (value ? dayjs(value).format('DD MMM, h:mm A') : '-');

export const formatQuantity = (value = 0, unit = '') => {
  const normalizedUnit = unit.toUpperCase();
  if (['PIECE', 'BOX', 'DOZEN'].includes(normalizedUnit)) {
    return `${Math.round(value)} ${unit}`;
  }
  const maximumFractionDigits = normalizedUnit === 'GRAM' ? 1 : 3;
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(value);
  return `${formatted} ${unit}`;
};
