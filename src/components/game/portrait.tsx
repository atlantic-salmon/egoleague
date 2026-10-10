import { CHARACTER_BY_ID, BLUE_LOCK_MAN } from "@/shared/catalog";

type Expr = "normal" | "ego" | "shock" | "smirk";

/** Stylised vector bust used for cards and cutscenes. */
export function Portrait({ id, expr = "normal", className, flip }: { id: string; expr?: Expr; className?: string; flip?: boolean }) {
  if (id === "blm") return <BlueLockManPortrait className={className} />;
  if (id === "ego") return <EgoPortrait className={className} expr={expr} />;
  const ch = CHARACTER_BY_ID[id] ?? CHARACTER_BY_ID.isagi;
  const eyeGlow = expr === "ego";
  const hair = ch.hair;
  const hs = ch.hairStyle;
  return (
    <svg viewBox="0 0 200 220" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-label={ch.name} role="img">
      <defs>
        <linearGradient id={`sh-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
      </defs>
      <path d="M30 220 C40 165 70 150 100 150 C130 150 160 165 170 220 Z" fill={`url(#sh-${id})`} />
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
      <g>
        {expr === "shock" ? (
          <>
            <circle cx="82" cy="102" r="8" fill="#fff" />
            <circle cx="118" cy="102" r="8" fill="#fff" />
            <circle cx="82" cy="102" r="3" fill={ch.eye} />
            <circle cx="118" cy="102" r="3" fill={ch.eye} />
          </>
        ) : (
          <>
            <path d="M70 100 Q82 92 94 100 Q82 108 70 100 Z" fill="#fff" />
            <path d="M106 100 Q118 92 130 100 Q118 108 106 100 Z" fill="#fff" />
            <circle cx="82" cy="100" r="4.5" fill={ch.eye} />
            <circle cx="118" cy="100" r="4.5" fill={ch.eye} />
            {eyeGlow && (
              <>
                <circle cx="82" cy="100" r="9" fill={ch.eye} opacity="0.35" />
                <circle cx="118" cy="100" r="9" fill={ch.eye} opacity="0.35" />
              </>
            )}
          </>
        )}
        <path d={expr === "ego" ? "M68 88 L96 94" : "M68 90 L94 90"} stroke={hair} strokeWidth="4" strokeLinecap="round" />
        <path d={expr === "ego" ? "M132 88 L104 94" : "M106 90 L132 90"} stroke={hair} strokeWidth="4" strokeLinecap="round" />
        <path
          d={expr === "smirk" || expr === "ego" ? "M90 130 Q104 136 112 126" : expr === "shock" ? "M94 130 Q100 138 106 130" : "M92 130 Q100 133 108 130"}
          stroke="#7f1d1d"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function EgoPortrait({ className, expr }: { className?: string; expr: Expr }) {
  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Ego Jinpachi">
      <path d="M30 220 C40 165 70 150 100 150 C130 150 160 165 170 220 Z" fill="#111827" />
      <rect x="88" y="122" width="24" height="34" rx="8" fill="#e7d3c2" />
      <path d="M64 84 C64 48 136 48 136 84 L134 114 C130 140 116 152 100 152 C84 152 70 140 66 114 Z" fill="#e7d3c2" />
      <path d="M50 120 C36 60 64 28 100 28 C136 28 164 60 150 120 L140 82 C126 66 74 66 60 82 Z" fill="#0f172a" />
      <rect x="66" y="92" width="30" height="18" rx="4" fill="#0b1220" stroke="#e5e7eb" strokeWidth="3" />
      <rect x="104" y="92" width="30" height="18" rx="4" fill="#0b1220" stroke="#e5e7eb" strokeWidth="3" />
      <path d="M96 100 L104 100" stroke="#e5e7eb" strokeWidth="3" />
      <rect x="70" y="96" width="22" height="4" fill="#38bdf8" opacity="0.7" />
      <rect x="108" y="96" width="22" height="4" fill="#38bdf8" opacity="0.7" />
      <path d={expr === "smirk" ? "M88 132 Q104 140 116 128" : "M90 132 L110 132"} stroke="#4b1d1d" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function BlueLockManPortrait({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Blue Lock Man">
      <rect x="22" y="140" width="156" height="90" rx="30" fill={BLUE_LOCK_MAN.body} stroke="#1d4ed8" strokeWidth="4" />
      <rect x="50" y="30" width="100" height="116" rx="28" fill={BLUE_LOCK_MAN.body} stroke="#1d4ed8" strokeWidth="4" />
      <rect x="62" y="70" width="76" height="22" rx="10" fill={BLUE_LOCK_MAN.visor}>
        <animate attributeName="opacity" values="1;0.55;1" dur="1.6s" repeatCount="indefinite" />
      </rect>
      <rect x="62" y="70" width="76" height="22" rx="10" fill={BLUE_LOCK_MAN.visor} opacity="0.4" filter="blur(6px)" />
      <text x="100" y="196" textAnchor="middle" fontFamily="Impact, sans-serif" fontSize="34" fill="#e0f2fe">
        BL
      </text>
      <path d="M70 116 L130 116" stroke="#1e3a8a" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
