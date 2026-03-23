import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EXHAUSTIVE_CHECKS } from './checks';

export function generateTechnicalSeoPdf(url: string, analysisResult: any) {
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Brand colors (Indigo-500)
        const primaryRGB = [99, 102, 241]; // #6366f1

        // ---- 1. Premium Header Section ----
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, pageWidth, 52, 'F');

        // Brand Name / Logo
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Seoptima', 32, 24);

        // Report Title & Date
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TECHNICAL SEO AUDIT', pageWidth - 18, 24, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageWidth - 18, 30, { align: 'right' });

        // ---- 2. Website & Score Overview ----
        // White sub-header bar
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(18, 42, pageWidth - 36, 24, 2, 2, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.roundedRect(18, 42, pageWidth - 36, 24, 2, 2, 'D');

        // Website URL
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Domain Analyzed', 24, 52);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(99, 102, 241);
        doc.text(url.length > 60 ? url.substring(0, 60) + '...' : url, 24, 59);

        // Health Score
        const score = Math.round(
            analysisResult?.stats?.performance?.performanceScore ||
            analysisResult?.stats?.score ||
            0
        );

        doc.setFillColor(99, 102, 241);
        doc.roundedRect(pageWidth - 62, 47, 38, 14, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('HEALTH SCORE', pageWidth - 43, 52, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`${score}/100`, pageWidth - 43, 59, { align: 'center' });

        // ---- 3. Core Web Vitals ----
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Core Web Vitals', 18, 80);

        const perf = analysisResult?.stats?.performance || {};
        autoTable(doc, {
            startY: 85,
            head: [['Metric', 'Value', 'Target Range']],
            body: [
                ['LCP — Largest Contentful Paint', `${perf?.largestContentfulPaint ?? 'N/A'}s`, '< 2.5s'],
                ['FCP — First Contentful Paint', `${perf?.firstContentfulPaint ?? 'N/A'}s`, '< 1.8s'],
                ['CLS — Cumulative Layout Shift', String(perf?.cumulativeLayoutShift ?? 'N/A'), '< 0.1'],
                ['TBT — Total Blocking Time', `${perf?.totalBlockingTime ?? 'N/A'}ms`, '< 200ms'],
            ],
            theme: 'striped',
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 10,
                cellPadding: 4,
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: 4,
                textColor: [60, 60, 60]
            },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
                2: { cellWidth: 35, halign: 'center', textColor: [100, 100, 100] },
            },
            margin: { left: 18, right: 18 },
        });

        // ---- 4. Technical Audit Checklist ----
        const lastTable = (doc as any).lastAutoTable;
        const auditY = lastTable ? lastTable.finalY + 15 : 130;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('Technical Audit Checklist', 18, auditY);

        const auditRows = EXHAUSTIVE_CHECKS.map(check => {
            const rawVal = analysisResult?.results?.[check.id];
            const status = rawVal ? String(rawVal).toUpperCase() : 'PENDING';

            let explanation = check.suggestion ?? '—';
            if (status !== 'PASS' && check.howToFix) {
                explanation += '\n\nFIX: ' + (check.howToFix || '');
            }

            return [check.title ?? 'Unknown', status, explanation];
        });

        autoTable(doc, {
            startY: auditY + 6,
            head: [['Audit Check', 'Status', 'Recommendation & Fast Fix']],
            body: auditRows,
            theme: 'grid',
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 10,
                cellPadding: 4,
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: [60, 60, 60]
            },
            columnStyles: {
                0: { cellWidth: 50, fontStyle: 'bold' },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 'auto', fontStyle: 'normal' },
            },
            margin: { left: 18, right: 18 },
            didParseCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 1) {
                    const v = String(data.cell.raw);
                    if (v === 'CRITICAL') {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (v === 'PASS') {
                        data.cell.styles.textColor = [22, 163, 74];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (v === 'WARNING') {
                        data.cell.styles.textColor = [202, 138, 4];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
        });

        // ---- Footer Section ----
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);

            // Footer Line
            doc.setDrawColor(240, 240, 240);
            doc.line(18, pageHeight - 15, pageWidth - 18, pageHeight - 15);

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'normal');

            // Left footer
            doc.text('© Seoptima SEO Platform — Premium Report', 18, pageHeight - 10);

            // Right footer (Page numbers)
            doc.text(
                `Page ${i} of ${totalPages}`,
                pageWidth - 18,
                pageHeight - 10,
                { align: 'right' }
            );
        }

        // ---- Filename & Trigger Download ----
        const hostname = url.replace(/https?:\/\//, '').split('/')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const fileName = `Audit-${hostname || 'report'}.pdf`;

        const pdfDataUri = doc.output('datauristring');
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
        }, 500);

    } catch (err: any) {
        console.error('[PDF] Generation failed:', err);
    }
}
