"use client";

import { useState } from "react";
import { CHARACTER_BY_ID } from "@/shared/catalog";
import { cn } from "@/lib/utils";

type Expr = "normal" | "ego" | "shock" | "smirk";

function SvgBust({ id, expr, className, flip }: { id: string; expr: Expr; className?: string; flip?: boolean }) {
  const ch = CHARACTER_BY_ID[id] ?? CHARACTER_BY_ID.isagi;
  const eyeGlow = expr === "ego";
  const hair = ch.hair;
  const hs = ch.hairStyle;
  return (
    <svg viewBox="0 0 200 220" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-label={ch.name} role="img">
      <path d="M85 150 L100 175 L115 150 Z" fill="#e2e8f0" />
      <rect x="86" y="120" width="28" height="36" rx="10" fill={ch.skin} />
      <path d="M58 82 C58 40 142 40 142 82 L140 112 C136 140 118 156 100 156 C82 156 64 140 60 112 Z" fill={ch.skin} />
      {hs === "long" && <path d="M48 70 C40 140 58 175 70 182 L66 100 Z M152 70 C160 140 142 175 130 182 L134 100 Z" fill={hair} />}
      {hs === "bob" && <path d="M46 76 C44 130 60 140 66 138 L64 90 Z M154 76 C156 130 140 140 134 138 L136 90 Z" fill={hair} />}
      <path
        d={
          hs === "spiky"
            ? "M44 86 L36 52 L58 60 L56 26 L80 44 L92 14 L106 40 L126 16 L130 46 L158 32 L148 62 L166 66 L152 92 C140 60 60 60 44 86 Z"
            : hs === "buzz"
              ? "M56 80 C56 44 144 44 144 80 C130 62 70 62 56 80 Z"
              : hs === "slick"
                ? "M50 92 C44 40 120 26 156 70 C150 60 130 54 110 60 C96 64 80 76 70 98 Z"
                : hs === "fluffy"
                  ? "M46 92 C30 60 54 26 80 32 C88 16 116 16 124 32 C150 26 172 60 154 92 C150 70 132 62 120 76 C112 64 88 64 80 76 C68 62 50 70 46 92 Z"
                  : "M44 96 C34 54 66 22 104 26 C140 28 166 56 156 96 L146 74 L134 84 L126 66 L112 80 L102 62 L90 80 L80 64 L70 84 L58 72 Z"
        }
        fill={hair}
      />
      {expr === "shock" ? (
        <>
          <ellipse cx="78" cy="108" rx="8" ry="10" fill="#fff" />
          <ellipse cx="122" cy="108" rx="8" ry="10" fill="#fff" />
          <circle cx="78" cy="110" r="4" fill={ch.eye} />
          <circle cx="122" cy="110" r="4" fill={ch.eye} />
        </>
      ) : (
        <>
          <ellipse cx="78" cy="108" rx="9" ry="8" fill="#fff" />
          <ellipse cx="122" cy="108" rx="9" ry="8" fill="#fff" />
          <circle cx="80" cy="108" r={eyeGlow ? 5 : 4} fill={ch.eye}>
            {eyeGlow && <animate attributeName="opacity" values="1;0.55;1" dur="1.2s" repeatCount="indefinite" />}
          </circle>
          <circle cx="124" cy="108" r={eyeGlow ? 5 : 4} fill={ch.eye}>
            {eyeGlow && <animate attributeName="opacity" values="1;0.55;1" dur="1.2s" repeatCount="indefinite" />}
          </circle>
          {eyeGlow && (
            <>
              <circle cx="80" cy="108" r="9" fill={ch.eye} opacity="0.35" filter="blur(3px)" />
              <circle cx="124" cy="108" r="9" fill={ch.eye} opacity="0.35" filter="blur(3px)" />
            </>
          )}
        </>
      )}
      <path d={expr === "ego" ? "M68 88 L96 94" : "M68 90 L94 90"} stroke={hair} strokeWidth="4" strokeLinecap="round" />
      <path d={expr === "ego" ? "M132 88 L104 94" : "M106 90 L132 90"} stroke={hair} strokeWidth="4" strokeLinecap="round" />
      <path
        d={expr === "smirk" || expr === "ego" ? "M90 130 Q104 136 112 126" : expr === "shock" ? "M94 130 Q100 138 106 130" : "M92 130 Q100 133 108 130"}
        stroke="#4b1d1d"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {id === "blm" && <path d="M70 148 H130" stroke="#22d3ee" strokeWidth="3" opacity="0.7" strokeLinecap="round" />}
    </svg>
  );
}

/**
 * Character bust. Prefers Legendary+ variant art at /portraits/variants/{variantId}.png,
 * then character PNG/JPG cutouts, then vector.
 */
export function Portrait({
  id,
  variantId,
  expr = "normal",
  className,
  flip,
}: {
  id: string;
  /** When set (Legendary+), try unique variant art first. */
  variantId?: string;
  expr?: Expr;
  className?: string;
  flip?: boolean;
}) {
  const [stage, setStage] = useState<"variant" | "png" | "jpg" | "svg">(variantId ? "variant" : "png");
  const ch = CHARACTER_BY_ID[id];
  const variantSrc = variantId ? `/portraits/variants/${variantId}.png` : null;
  const png = `/portraits/${id}.png`;
  const jpg = `/portraits/${id}.jpg`;

  if (!ch || stage === "svg") {
    return <SvgBust id={id} expr={expr} className={className} flip={flip} />;
  }

  const src = stage === "variant" && variantSrc ? variantSrc : stage === "jpg" ? jpg : png;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${id}-${variantId ?? ""}-${stage}`}
      src={src}
      alt={ch.name}
      className={cn("object-contain object-bottom", className)}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      onError={() => {
        if (stage === "variant") setStage("png");
        else if (stage === "png") setStage("jpg");
        else setStage("svg");
      }}
      draggable={false}
    />
  );
}
