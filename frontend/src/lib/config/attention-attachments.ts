export type AttentionAttachmentFamily =
  "image" | "pdf" | "word" | "excel" | "powerpoint" | "file";

export type AttentionAttachmentIssue =
  | "empty"
  | "tooLarge"
  | "unsupportedFormat"
  | "mimeMismatch";

const FORMATS: Record<
  string,
  { family: AttentionAttachmentFamily; mime: string[] }
> = {
  jpg: { family: "image", mime: ["image/jpeg", "image/jpg"] },
  jpeg: { family: "image", mime: ["image/jpeg", "image/jpg"] },
  png: { family: "image", mime: ["image/png"] },
  webp: { family: "image", mime: ["image/webp"] },
  pdf: { family: "pdf", mime: ["application/pdf"] },
  doc: { family: "word", mime: ["application/msword"] },
  docx: {
    family: "word",
    mime: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  odt: { family: "word", mime: ["application/vnd.oasis.opendocument.text"] },
  xls: { family: "excel", mime: ["application/vnd.ms-excel"] },
  xlsx: {
    family: "excel",
    mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
  ods: {
    family: "excel",
    mime: ["application/vnd.oasis.opendocument.spreadsheet"],
  },
  ppt: { family: "powerpoint", mime: ["application/vnd.ms-powerpoint"] },
  pptx: {
    family: "powerpoint",
    mime: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  odp: {
    family: "powerpoint",
    mime: ["application/vnd.oasis.opendocument.presentation"],
  },
};

const GENERIC_MIME = new Set([
  "",
  "application/octet-stream",
  "application/x-ole-storage",
  "application/cdfv2",
]);

const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export const ATTENTION_ATTACHMENT_ACCEPT = Object.keys(FORMATS)
  .map((item) => `.${item}`)
  .join(",");

export function attentionAttachmentFamily(
  name: string,
): AttentionAttachmentFamily {
  return FORMATS[extension(name)]?.family ?? "file";
}

export function attentionAttachmentExtension(name: string): string {
  return extension(name).toUpperCase() || "FILE";
}

export function attentionAttachmentIssue(
  file: File,
  maxBytes: number,
): AttentionAttachmentIssue | null {
  const format = FORMATS[extension(file.name)];
  const mime = file.type.toLowerCase();
  if (file.size <= 0) return "empty";
  if (file.size > maxBytes) return "tooLarge";
  if (!format) return "unsupportedFormat";
  if (!GENERIC_MIME.has(mime) && !format.mime.includes(mime))
    return "mimeMismatch";
  return null;
}
