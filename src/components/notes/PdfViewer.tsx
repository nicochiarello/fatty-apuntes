"use client";

export function PdfViewer({ url }: { url: string }) {
  return <iframe src={url} title="Contenido del apunte" className="h-full w-full bg-white" />;
}
