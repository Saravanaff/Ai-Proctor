import jsPDF from "jspdf";

export interface PdfReportData {
  user: {
    id: number;
    name: string;
    email: string;
  };
  exam: {
    id: number;
    name: string;
    date: string;
  };
  score?: {
    value: number;
    breakdown?: Record<string, number | boolean>;
  };
}

export function generateParticipantPdf(data: PdfReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Professional gradient header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Add subtle gradient effect
  for (let i = 0; i < 32; i++) {
    const alpha = 1 - (i / 32) * 0.3;
    doc.setFillColor(59 + i, 130 + i * 0.5, 246);
    doc.rect(0, i, pageWidth, 1, "F");
  }

  // Header text with shadow effect
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AI-PROCTOR", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Assessment Report", pageWidth / 2, 26, { align: "center" });

  let currentY = 45;

  // Participant Information Card
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PARTICIPANT INFORMATION", 20, currentY);

  // Stylish underline
  doc.setFillColor(59, 130, 246);
  doc.rect(20, currentY + 2, 80, 2, "F");

  currentY += 12;

  // Card with rounded effect (simulated)
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, pageWidth - 30, 28, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY, pageWidth - 30, 28, "S");

  // Two-column layout
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Full Name:", 25, currentY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(data.user.name, 25, currentY + 15);

  doc.setFont("helvetica", "bold");
  doc.text("Email Address:", 25, currentY + 22);
  doc.setFont("helvetica", "normal");
  doc.text(data.user.email, 70, currentY + 22);

  doc.setFont("helvetica", "bold");
  doc.text("User ID:", pageWidth - 80, currentY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.user.id), pageWidth - 80, currentY + 15);

  currentY += 40;

  // Examination Details Card
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("EXAMINATION DETAILS", 20, currentY);

  // Stylish underline
  doc.setFillColor(59, 130, 246);
  doc.rect(20, currentY + 2, 80, 2, "F");

  currentY += 12;

  doc.setFillColor(255, 255, 255);
  doc.rect(15, currentY, pageWidth - 30, 28, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY, pageWidth - 30, 28, "S");

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Examination Name:", 25, currentY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(data.exam.name, 25, currentY + 15);

  doc.setFont("helvetica", "bold");
  doc.text("Exam ID:", 25, currentY + 22);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.exam.id), 70, currentY + 22);

  doc.setFont("helvetica", "bold");
  doc.text("Assessment Date:", pageWidth - 80, currentY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(data.exam.date, pageWidth - 80, currentY + 15);

  currentY += 40;

  // Assessment Results - Better visibility
  if (data.score) {
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ASSESSMENT RESULTS", 20, currentY);

    // Stylish underline
    doc.setFillColor(59, 130, 246);
    doc.rect(20, currentY + 2, 80, 2, "F");

    currentY += 12;

    // Score card with better visibility
    const scoreColor =
      data.score.value <= 40
        ? [34, 197, 94]
        : data.score.value <= 70
        ? [251, 191, 36]
        : [239, 68, 68];

    // Main score area
    doc.setFillColor(255, 255, 255);
    doc.rect(15, currentY, pageWidth - 30, 35, "F");
    doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.setLineWidth(2);
    doc.rect(15, currentY, pageWidth - 30, 35, "S");

    // Score circle background
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.circle(pageWidth - 40, currentY + 17, 15, "F");

    // Score text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.score.value}%`, pageWidth - 40, currentY + 20, {
      align: "center",
    });

    // Score description
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Integrity Assessment Score", 25, currentY + 12);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const scoreLabel =
      data.score.value <= 40
        ? "SAFE - LOW VIOLATIONS"
        : data.score.value <= 70
        ? "MODERATE VIOLATIONS"
        : "HIGH RISK - MANY VIOLATIONS";
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(scoreLabel, 25, currentY + 22);

    currentY += 45;

    // Violations Analysis
    if (data.score.breakdown) {
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("VIOLATIONS ANALYSIS", 20, currentY);

      // Stylish underline
      doc.setFillColor(239, 68, 68);
      doc.rect(20, currentY + 2, 80, 2, "F");

      currentY += 12;

      // Calculate available space for violations table
      const footerSpace = 30; // Space reserved for footer
      const availableHeight = pageHeight - currentY - footerSpace;

      // Calculate violations and determine if we need multiple columns
      const violationEntries = Object.entries(data.score.breakdown).filter(
        ([key]) =>
          key !== "total_score" &&
          key !== "screen_sharing" &&
          key !== "safe_browser"
      );

      const rowHeight = 8;
      const headerHeight = 15;
      const maxRowsPerColumn = Math.floor(
        (availableHeight - headerHeight) / rowHeight
      );
      const needsMultipleColumns = violationEntries.length > maxRowsPerColumn;

      if (needsMultipleColumns) {
        // Two-column layout for many violations
        const columnWidth = (pageWidth - 40) / 2;
        const leftColumnX = 15;
        const rightColumnX = leftColumnX + columnWidth + 10;

        // Left column - no border
        doc.setFillColor(255, 255, 255);
        doc.rect(leftColumnX, currentY, columnWidth, availableHeight - 10, "F");

        // Right column - no border
        doc.rect(
          rightColumnX,
          currentY,
          columnWidth,
          availableHeight - 10,
          "F"
        );

        let leftY = currentY + 8;
        let rightY = currentY + 8;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 41, 55);

        // Headers
        doc.text("Violation Category", leftColumnX + 5, leftY);
        doc.text("Count", leftColumnX + columnWidth - 10, leftY, {
          align: "right",
        });
        doc.text("Violation Category", rightColumnX + 5, rightY);
        doc.text("Count", rightColumnX + columnWidth - 10, rightY, {
          align: "right",
        });

        leftY += 10;
        rightY += 10;

        doc.setFont("helvetica", "normal");
        let isLeftColumn = true;

        violationEntries.forEach(([key, val], index) => {
          const label = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          let value: string;

          if (typeof val === "boolean") {
            value = val ? "Detected" : "Not Detected";
          } else {
            value = String(val);
          }

          const currentX = isLeftColumn ? leftColumnX : rightColumnX;
          const currentY = isLeftColumn ? leftY : rightY;

          // Alternating row colors
          if (index % 4 < 2) {
            doc.setFillColor(249, 250, 251);
            doc.rect(currentX + 2, currentY - 2, columnWidth - 4, 7, "F");
          }

          doc.setTextColor(75, 85, 99);
          doc.text(label, currentX + 5, currentY + 2);

          // Color coding
          if (
            (typeof val === "number" && val > 0) ||
            (typeof val === "boolean" && val === true)
          ) {
            doc.setTextColor(239, 68, 68);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(34, 197, 94);
            doc.setFont("helvetica", "normal");
          }
          doc.text(value, currentX + columnWidth - 10, currentY + 2, {
            align: "right",
          });

          if (isLeftColumn) {
            leftY += 7;
            if (leftY > currentY + availableHeight - 20) {
              isLeftColumn = false;
            }
          } else {
            rightY += 7;
          }

          if (index < violationEntries.length - 1) {
            isLeftColumn = !isLeftColumn;
          }
        });
      } else {
        // Single column layout for fewer violations
        const tableHeight = Math.min(
          availableHeight - 10,
          violationEntries.length * rowHeight + headerHeight
        );

        // Table background without border
        doc.setFillColor(255, 255, 255);
        doc.rect(15, currentY, pageWidth - 30, tableHeight, "F");

        let violationY = currentY + 8;
        doc.setFontSize(10);

        // Table headers
        doc.setFillColor(248, 250, 252);
        doc.rect(20, violationY - 3, pageWidth - 40, 12, "F");
        doc.setTextColor(31, 41, 55);
        doc.setFont("helvetica", "bold");
        doc.text("Violation Category", 25, violationY + 3);
        doc.text("Count", pageWidth - 25, violationY + 3, { align: "right" });

        violationY += 12;
        doc.setDrawColor(226, 232, 240);
        doc.line(20, violationY - 2, pageWidth - 20, violationY - 2);

        doc.setFont("helvetica", "normal");
        let rowCount = 0;

        violationEntries.forEach(([key, val]) => {
          // Alternating row colors
          if (rowCount % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(20, violationY - 2, pageWidth - 40, 8, "F");
          }

          const label = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          let value: string;

          if (typeof val === "boolean") {
            value = val ? "Detected" : "Not Detected";
          } else {
            value = String(val);
          }

          doc.setTextColor(75, 85, 99);
          doc.text(label, 25, violationY + 2);

          // Color coding
          if (
            (typeof val === "number" && val > 0) ||
            (typeof val === "boolean" && val === true)
          ) {
            doc.setTextColor(239, 68, 68);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(34, 197, 94);
            doc.setFont("helvetica", "normal");
          }
          doc.text(value, pageWidth - 25, violationY + 2, { align: "right" });

          violationY += 8;
          rowCount++;
        });
      }
    }
  }

  // Professional footer - positioned at bottom
  const footerY = pageHeight - 20;
  doc.setFillColor(249, 250, 251);
  doc.rect(0, footerY, pageWidth, 20, "F");
  doc.setDrawColor(229, 231, 235);
  doc.line(0, footerY, pageWidth, footerY);

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Generated by AI-Proctor Assessment System",
    pageWidth / 2,
    footerY + 8,
    { align: "center" }
  );
  doc.text(
    `Report Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    footerY + 15,
    { align: "center" }
  );

  doc.save(`participant_report_${data.user.name.replace(/\s+/g, "_")}.pdf`);
}
