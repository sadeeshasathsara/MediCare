import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Image,
  Film,
  Music,
  File,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── File-type detection ──────────────────────────────────────────────────────
function detectFileType(url = "", mimetype = "") {
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();

  if (mime.startsWith("image/") || ["png","jpg","jpeg","gif","webp","svg","bmp","avif","ico"].includes(ext))
    return "image";
  if (mime === "application/pdf" || ext === "pdf")
    return "pdf";
  if (mime.startsWith("video/") || ["mp4","webm","mov","avi","mkv","ogg"].includes(ext))
    return "video";
  if (mime.startsWith("audio/") || ["mp3","wav","ogg","aac","flac","m4a"].includes(ext))
    return "audio";
  if (["txt","log","env","ini"].includes(ext) || mime === "text/plain")
    return "text";
  if (["json","xml","yaml","yml","csv","md","markdown","ts","tsx","js","jsx","py","html","css"].includes(ext))
    return "code";
  if (["doc","docx","xls","xlsx","ppt","pptx"].includes(ext))
    return "office";
  return "unknown";
}

const TYPE_ICON = {
  image:   Image,
  pdf:     FileText,
  video:   Film,
  audio:   Music,
  text:    FileText,
  code:    FileText,
  office:  FileText,
  unknown: File,
};

const TYPE_LABEL = {
  image:   "Image",
  pdf:     "PDF",
  video:   "Video",
  audio:   "Audio",
  text:    "Text",
  code:    "Document",
  office:  "Office File",
  unknown: "File",
};

// ─── Individual viewers ───────────────────────────────────────────────────────
function ImageViewer({ url }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const zoomIn  = () => setZoom((z) => Math.min(z + 0.25, 4));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const rotate  = () => setRotation((r) => (r + 90) % 360);
  const reset   = () => { setZoom(1); setRotation(0); };

  return (
    <div className="flex flex-col h-full">
      {/* Image toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 shrink-0">
        <Button variant="ghost" size="sm" onClick={zoomOut}  className="gap-1.5 text-xs cursor-pointer" disabled={zoom <= 0.25}><ZoomOut className="h-3.5 w-3.5"/> Zoom Out</Button>
        <span className="text-xs font-mono bg-muted px-2 py-1 rounded min-w-[52px] text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={zoomIn}   className="gap-1.5 text-xs cursor-pointer" disabled={zoom >= 4}><ZoomIn className="h-3.5 w-3.5"/> Zoom In</Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={rotate}   className="gap-1.5 text-xs cursor-pointer"><RotateCw className="h-3.5 w-3.5"/> Rotate</Button>
        <Button variant="ghost" size="sm" onClick={reset}    className="gap-1.5 text-xs cursor-pointer">Reset</Button>
      </div>
      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0d0d0d] p-6">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}
        <img
          src={url}
          alt="Document preview"
          onLoad={() => setLoaded(true)}
          className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          draggable={false}
        />
      </div>
    </div>
  );
}

function PdfViewer({ url }) {
  return (
    <div className="flex-1 min-h-0 h-full">
      <iframe
        src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
        title="PDF Viewer"
        className="w-full h-full border-0"
      />
    </div>
  );
}

function VideoViewer({ url }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <video
        src={url}
        controls
        className="max-w-full max-h-full"
        style={{ maxHeight: "calc(100% - 1rem)" }}
      >
        Your browser does not support video playback.
      </video>
    </div>
  );
}

function AudioViewer({ url, filename }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-b from-primary/5 to-background">
      <div className="h-32 w-32 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
        <Music className="h-16 w-16 text-primary/60" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg">{filename}</p>
        <p className="text-sm text-muted-foreground mt-1">Audio file</p>
      </div>
      <audio src={url} controls className="w-full max-w-md" />
    </div>
  );
}

function TextViewer({ url }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setError("Unable to load file content."))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  if (error)   return <div className="flex-1 flex items-center justify-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" />{error}</div>;

  return (
    <div className="flex-1 overflow-auto p-6 bg-[#0d1117]">
      <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{content}</pre>
    </div>
  );
}

function OfficeViewer({ url, filename }) {
  const encoded = encodeURIComponent(url);
  // Try Microsoft Office Online viewer for public URLs
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
  return (
    <div className="flex-1 min-h-0 h-full">
      <iframe
        src={viewerUrl}
        title={filename}
        className="w-full h-full border-0"
      />
    </div>
  );
}

function UnknownViewer({ url, filename }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10 text-center">
      <div className="h-24 w-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-muted">
        <File className="h-12 w-12 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-lg font-semibold">{filename}</p>
        <p className="text-muted-foreground text-sm mt-1">Preview is not available for this file type.</p>
      </div>
      <a href={url} download={filename} target="_blank" rel="noreferrer">
        <Button className="gap-2 cursor-pointer">
          <Download className="h-4 w-4" /> Download File
        </Button>
      </a>
    </div>
  );
}

// ─── Main DocumentViewer ──────────────────────────────────────────────────────
/**
 * @param {object} props
 * @param {boolean} props.isOpen        - Whether the viewer is visible
 * @param {() => void} props.onClose    - Called to close the viewer
 * @param {string} props.url            - URL of the document to view
 * @param {string} [props.filename]     - Display name of the file
 * @param {string} [props.mimetype]     - MIME type hint (optional)
 */
export default function DocumentViewer({ isOpen, onClose, url = "", filename = "Document", mimetype = "" }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const fileType = detectFileType(url, mimetype);
  const TypeIcon = TYPE_ICON[fileType] || File;
  const typeLabel = TYPE_LABEL[fileType] || "File";

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent scroll behind modal
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdropClick}
    >
      {/* Container */}
      <div
        ref={containerRef}
        className={`relative bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300
          ${isFullscreen ? "w-screen h-screen rounded-none" : "w-full max-w-4xl h-[85vh]"}`}
        style={{ animation: "viewer-in 0.2s ease" }}
      >
        {/* ── Title bar ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-muted/20 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TypeIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{filename}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] tracking-wide uppercase shrink-0">{typeLabel}</Badge>

          <div className="flex items-center gap-1 ml-2">
            {/* External link */}
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" title="Open in new tab">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
            {/* Download */}
            <a href={url} download={filename}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" title="Download">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={() => setIsFullscreen((f) => !f)}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
              title="Close"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Viewer area ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {fileType === "image"   && <ImageViewer  url={url} />}
          {fileType === "pdf"     && <PdfViewer    url={url} />}
          {fileType === "video"   && <VideoViewer  url={url} />}
          {fileType === "audio"   && <AudioViewer  url={url} filename={filename} />}
          {(fileType === "text" || fileType === "code") && <TextViewer url={url} />}
          {fileType === "office"  && <OfficeViewer url={url} filename={filename} />}
          {fileType === "unknown" && <UnknownViewer url={url} filename={filename} />}
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes viewer-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
