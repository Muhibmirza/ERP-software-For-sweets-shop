const printStyles = `
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { margin: 0; padding: 0; }
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: "Courier New", monospace, Arial, sans-serif;
    width: 80mm;
    max-width: 80mm;
  }
  * {
    box-sizing: border-box;
    color: #000 !important;
    box-shadow: none !important;
    text-shadow: none !important;
    font-weight: 800 !important;
  }
  .thermal-print {
    width: 70mm;
    max-width: 70mm;
    margin: 0;
    padding: 0 1mm;
    font-family: "Courier New", monospace, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.28;
    overflow: hidden;
  }
  .a4-print {
    width: 190mm;
    max-width: 190mm;
    margin: 0 auto;
    padding: 0;
    font-family: Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.35;
  }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border-bottom: 1px dashed #000; padding: 2px 0; font-size: 8.8pt; overflow-wrap: anywhere; word-break: break-word; }
  .print-center { text-align: center; }
  .print-center img { width: 112px !important; height: 112px !important; object-fit: contain; filter: grayscale(1) contrast(2.1) brightness(0.72); }
  .print-line { border-top: 1px dashed #000; margin: 5px 0; }
  .print-row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
  .print-total { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; font-weight: 900; font-size: 13pt; }
  .no-print { display: none !important; }
`;

export function silentPrint(htmlContent: string): void {
  const printableHtml = htmlContent
    .replace(/src="\/assets\//g, `src="${window.location.origin}/assets/`)
    .replace(/src='\/assets\//g, `src='${window.location.origin}/assets/`);
  const electronPrint = (window as any).electronAPI?.silentPrintHtml;
  if (electronPrint) {
    electronPrint(printableHtml).catch((error: unknown) => {
      console.error('Silent print failed', error);
    });
    return;
  }
  browserPrint(printableHtml);
}

function browserPrint(htmlContent: string): void {
  document.getElementById('silent-print-frame')?.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'silent-print-frame';
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <base href="${window.location.origin}/">
        <style>${printStyles}</style>
      </head>
      <body>
        ${htmlContent}
        <script>
          function waitForImages() {
            var images = Array.prototype.slice.call(document.images || []);
            if (!images.length) return Promise.resolve();
            return Promise.all(images.map(function(img) {
              if (img.complete && img.naturalWidth > 0) return Promise.resolve();
              if (img.decode) return img.decode().catch(function() {});
              return new Promise(function(resolve) {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 1500);
              });
            }));
          }
          window.onload = function() {
            waitForImages().then(function() {
              window.focus();
              window.print();
              window.onafterprint = function() {
                var frame = window.parent.document.getElementById('silent-print-frame');
                if (frame) frame.remove();
              };
            });
          };
        <\/script>
      </body>
    </html>
  `);
  iframeDoc.close();
}

export function printElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  silentPrint(element.innerHTML);
}
