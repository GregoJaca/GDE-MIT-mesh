import { jsPDF } from 'jspdf';
import { setGeneratedPdf, bumpPdfStoreVersion } from '@/stores/pdf.store';
import type { ReportData } from '@/types';
import { formatDate } from '@/lib/utils';

export function generateAndStorePdf(data: ReportData): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.topic, margin, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(
        `Provider: ${data.doctorId}  |  Date: ${formatDate(data.date)}  |  Patient: ${data.patientId}`,
        margin,
        34,
    );

    doc.setDrawColor(200);
    doc.line(margin, 38, pageWidth - margin, 38);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Clinical Notes', margin, 50);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.reportNotes, usableWidth);
    doc.text(lines, margin, 60);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(
            `MediCore \u2014 Generated ${new Date().toLocaleString()} \u2014 Page ${i} of ${pageCount}`,
            margin,
            doc.internal.pageSize.getHeight() - 10,
        );
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    setGeneratedPdf(data.appointmentId, blobUrl);
    bumpPdfStoreVersion();
}
