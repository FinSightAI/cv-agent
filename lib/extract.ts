import mammoth from "mammoth";

export async function extractText(
  buffer: Buffer,
  mime: string,
  filename?: string,
): Promise<string> {
  const lower = (filename ?? "").toLowerCase();

  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (mime.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return buffer.toString("utf8").trim();
  }

  throw new Error(`Unsupported file type: ${mime}`);
}
