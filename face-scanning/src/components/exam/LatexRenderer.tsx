import React, { useEffect, useRef } from "react";

interface LatexRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LatexRenderer component - renders LaTeX math expressions using KaTeX
 * Dynamically loads KaTeX only when needed to keep bundle size small
 */
const LatexRenderer: React.FC<LatexRendererProps> = ({
  content,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isKatexLoaded, setIsKatexLoaded] = React.useState(false);

  useEffect(() => {
    // Dynamically load KaTeX CSS
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      link.integrity =
        "sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }

    // Dynamically load KaTeX JS
    if (!window.katex) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.integrity =
        "sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8";
      script.crossOrigin = "anonymous";
      script.onload = () => setIsKatexLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsKatexLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isKatexLoaded || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    try {
      // Process the content to find LaTeX expressions
      const parts = parseLatexContent(content);

      parts.forEach((part) => {
        if (part.type === "latex") {
          const span = document.createElement("span");
          window.katex.render(part.content, span, {
            throwOnError: false,
            displayMode: part.display,
          });
          container.appendChild(span);
        } else {
          const textNode = document.createTextNode(part.content);
          container.appendChild(textNode);
        }
      });
    } catch (error) {
      console.error("Error rendering LaTeX:", error);
      container.textContent = content;
    }
  }, [content, isKatexLoaded]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {!isKatexLoaded && content}
    </div>
  );
};

/**
 * Parse content to separate text and LaTeX expressions
 * Supports both inline $...$ and display $$...$$ math
 */
function parseLatexContent(
  content: string
): Array<{ type: "text" | "latex"; content: string; display?: boolean }> {
  const parts: Array<{
    type: "text" | "latex";
    content: string;
    display?: boolean;
  }> = [];
  let currentIndex = 0;

  // Regular expression to match $$...$$ (display) or $...$ (inline)
  const regex = /\$\$([\s\S]+?)\$\$|\$([^\$]+?)\$/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push({
        type: "text",
        content: content.slice(currentIndex, match.index),
      });
    }

    // Add LaTeX expression
    if (match[1] !== undefined) {
      // Display math $$...$$
      parts.push({
        type: "latex",
        content: match[1],
        display: true,
      });
    } else if (match[2] !== undefined) {
      // Inline math $...$
      parts.push({
        type: "latex",
        content: match[2],
        display: false,
      });
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(currentIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", content }];
}

// Extend window type for KaTeX
declare global {
  interface Window {
    katex: any;
  }
}

export default LatexRenderer;
