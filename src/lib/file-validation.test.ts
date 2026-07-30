import { describe, expect, it } from "vitest";
import { detectFileKind, extensionForKind, mimeTypeForKind } from "@/lib/file-validation";

describe("detectFileKind", () => {
  it("recognizes a PDF by its magic bytes", () => {
    const buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("rest of file")]);
    expect(detectFileKind(buffer)).toBe("pdf");
  });

  it("recognizes a JPEG by its magic bytes", () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectFileKind(buffer)).toBe("jpg");
  });

  it("recognizes a PNG by its magic bytes", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(detectFileKind(buffer)).toBe("png");
  });

  it("recognizes a DOCX (ZIP container) by its magic bytes", () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    expect(detectFileKind(buffer)).toBe("docx");
  });

  it("rejects an unrecognized or spoofed file", () => {
    const buffer = Buffer.from("<html><body>not a real file</body></html>");
    expect(detectFileKind(buffer)).toBeNull();
  });

  it("does not trust a claimed extension over the actual bytes", () => {
    // A .pdf-named file whose content is plain text should not be classified as a PDF.
    const buffer = Buffer.from("this is definitely not a pdf");
    expect(detectFileKind(buffer)).toBeNull();
  });

  it("rejects an empty buffer", () => {
    expect(detectFileKind(Buffer.alloc(0))).toBeNull();
  });
});

describe("mimeTypeForKind / extensionForKind", () => {
  it("maps each detected kind to a MIME type and extension", () => {
    expect(mimeTypeForKind("pdf")).toBe("application/pdf");
    expect(extensionForKind("pdf")).toBe("pdf");
    expect(mimeTypeForKind("jpg")).toBe("image/jpeg");
    expect(extensionForKind("png")).toBe("png");
    expect(extensionForKind("docx")).toBe("docx");
  });
});
