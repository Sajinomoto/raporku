// Dynamic import wrapper untuk @react-pdf/renderer
// Tidak ada static import dari package tersebut, sehingga Next.js tidak akan
// mencoba me-bundle sharp (native addon) saat build di Vercel.

import type { RaporPDFProps } from "@/components/rapor-pdf";

export async function downloadPDF(props: RaporPDFProps): Promise<Blob> {
  // Dynamic import — hanya di-load saat runtime, bukan saat build
  const rp = await import("@react-pdf/renderer");
  const { createRaporPDF } = await import("@/components/rapor-pdf");

  const element = createRaporPDF(
    {
      Document: rp.Document,
      Page: rp.Page,
      View: rp.View,
      Text: rp.Text,
      Image: rp.Image,
      StyleSheet: rp.StyleSheet,
    },
    props,
  );

  const pdfDoc = rp.pdf(element);
  const blob = await pdfDoc.toBlob();
  return blob;
}
