import PDFDocument from "pdfkit";
import { Maintenance, ChecklistItem, Photo, Station } from "../drizzle/schema";

type MaintenanceWithItems = Maintenance & {
  items: (ChecklistItem & { photos: Photo[] })[];
};

export async function generateMaintenancePDF(
  maintenance: MaintenanceWithItems,
  station: Station,
  technicianName: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Cores RR Engenharia
    const primaryColor = "#0963ed"; // Azul claro
    const darkColor = "#001c3d"; // Azul escuro
    const textColor = "#ffffff"; // Branco

    // Cabeçalho com identidade visual
    doc.rect(0, 0, doc.page.width, 120).fill(darkColor);
    
    doc.fontSize(24).fillColor(textColor).font("Helvetica-Bold");
    doc.text("RR ENGENHARIA E SOLUÇÕES", 50, 30);
    
    doc.fontSize(12).fillColor(primaryColor).font("Helvetica");
    doc.text("Sua Parceira em Obras e Instalações", 50, 60);

    doc.fontSize(18).fillColor(textColor).font("Helvetica-Bold");
    doc.text("Relatório de Manutenção Preventiva", 50, 85);

    // Informações básicas
    doc.fillColor("#000000").font("Helvetica");
    let yPos = 150;

    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("Informações da Manutenção", 50, yPos);
    yPos += 25;

    doc.fontSize(10).font("Helvetica");
    doc.text(`Cliente: CASAS GUANABARA`, 50, yPos);
    yPos += 15;
    doc.text(`Posto: ${station.name}`, 50, yPos);
    yPos += 15;
    doc.text(`Endereço: ${station.address}`, 50, yPos);
    yPos += 15;
    doc.text(`Preventiva Nº: ${maintenance.preventiveNumber}`, 50, yPos);
    yPos += 15;
    doc.text(`Data: ${new Date(maintenance.date).toLocaleDateString("pt-BR")}`, 50, yPos);
    yPos += 15;
    doc.text(`Técnico: ${technicianName}`, 50, yPos);
    yPos += 25;

    if (maintenance.observations) {
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("Observações Gerais:", 50, yPos);
      yPos += 15;
      doc.fontSize(10).font("Helvetica");
      doc.text(maintenance.observations, 50, yPos, { width: 500 });
      yPos += 30;
    }

    // Resumo executivo - não conformidades
    const nonConformities = maintenance.items.filter(
      (item) => item.status !== "confere" && item.status !== "nao_conferido"
    );

    if (nonConformities.length > 0) {
      doc.addPage();
      yPos = 50;

      doc.fontSize(14).font("Helvetica-Bold").fillColor(darkColor);
      doc.text("Resumo Executivo - Não Conformidades", 50, yPos);
      yPos += 25;

      doc.fontSize(10).font("Helvetica").fillColor("#000000");
      doc.text(`Total de não conformidades encontradas: ${nonConformities.length}`, 50, yPos);
      yPos += 20;

      nonConformities.forEach((item, index) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(10).font("Helvetica-Bold");
        doc.text(`${index + 1}. ${item.equipmentName}`, 50, yPos);
        yPos += 15;

        doc.fontSize(9).font("Helvetica");
        doc.text(`Status: ${getStatusLabel(item.status)}`, 70, yPos);
        yPos += 12;

        if (item.correctiveAction) {
          doc.text(`Ação Corretiva: ${item.correctiveAction}`, 70, yPos, { width: 450 });
          yPos += 15;
        }

        yPos += 10;
      });
    }

    // Tabela de verificações
    doc.addPage();
    yPos = 50;

    doc.fontSize(14).font("Helvetica-Bold").fillColor(darkColor);
    doc.text("Checklist de Equipamentos", 50, yPos);
    yPos += 25;

    // Cabeçalho da tabela
    doc.fontSize(9).font("Helvetica-Bold").fillColor(textColor);
    doc.rect(50, yPos, 500, 20).fill(primaryColor);
    doc.text("Item", 55, yPos + 5);
    doc.text("Equipamento", 100, yPos + 5);
    doc.text("Status", 380, yPos + 5);
    doc.text("Valor", 480, yPos + 5);
    yPos += 25;

    // Linhas da tabela
    doc.fillColor("#000000").font("Helvetica");
    maintenance.items.forEach((item) => {
      if (yPos > 750) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(8);
      doc.text(item.itemNumber.toString(), 55, yPos);
      doc.text(item.equipmentName.substring(0, 35), 100, yPos);
      doc.text(getStatusLabel(item.status).substring(0, 15), 380, yPos);
      doc.text(item.value || "-", 480, yPos);
      
      yPos += 15;

      if (item.correctiveAction) {
        doc.fontSize(7).fillColor("#666666");
        doc.text(`Ação: ${item.correctiveAction.substring(0, 80)}`, 100, yPos, { width: 400 });
        yPos += 12;
        doc.fillColor("#000000");
      }
    });

    // Rodapé
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#666666");
      doc.text(
        `Página ${i + 1} de ${pageCount} | RR Engenharia e Soluções | ${new Date().toLocaleDateString("pt-BR")}`,
        50,
        doc.page.height - 50,
        { align: "center", width: doc.page.width - 100 }
      );
    }

    doc.end();
  });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confere: "Confere",
    nao_conferido: "Não Conferido",
    realizar_limpeza: "Realizar Limpeza",
    realizar_reparo: "Realizar Reparo",
    realizar_troca: "Realizar Troca",
  };
  return labels[status] || status;
}
