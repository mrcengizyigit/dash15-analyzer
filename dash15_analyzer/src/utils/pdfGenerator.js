import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export const generateAgentReport = async (elementId, agentName) => {
    console.log('Starting PDF generation for:', agentName);
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found:', elementId);
        alert('Rapor oluşturulacak içerik bulunamadı.');
        return;
    }

    try {
        // Scroll to top to ensure full capture
        window.scrollTo(0, 0);
        console.log('Scrolled to top, starting html-to-image...');

        // Generate image using html-to-image
        const dataUrl = await toPng(element, {
            quality: 0.95,
            backgroundColor: '#0f172a', // Match the dark theme background
            filter: (node) => {
                // Ignore buttons or interactive elements if needed
                return !node.classList || !node.classList.contains('no-print');
            }
        });

        console.log('Image data generated successfully');

        // PDF setup
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm

        // Calculate dimensions
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        console.log('Adding image to PDF...');
        // Add first page
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add subsequent pages if content overflows
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        console.log('Saving PDF...');
        // Save the PDF
        const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
        pdf.save(`${agentName}_Performans_Raporu_${dateStr}.pdf`);
        console.log('PDF saved!');

    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('PDF oluşturulurken bir hata oluştu: ' + error.message);
    }
};
