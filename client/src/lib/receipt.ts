import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function printElementPdf(elementId: string, fileName: string, format: 'thermal' | 'a4' = 'thermal') {
  const element = document.getElementById(elementId);
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
  const image = canvas.toDataURL('image/png');
  const pdf = format === 'thermal' ? new jsPDF({ unit: 'mm', format: [80, 180] }) : new jsPDF('p', 'mm', 'a4');
  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height * width) / canvas.width;
  pdf.addImage(image, 'PNG', 0, 0, width, Math.min(height, pdf.internal.pageSize.getHeight()));
  pdf.save(fileName);
}
