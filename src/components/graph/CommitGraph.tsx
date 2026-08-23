import React, { useRef, useEffect, useCallback, useState } from "react";

// --- TYPES & INTERFACES ---

export interface CommitNode {
  sha: string;
  message: string;
  author: string;
  avatar: string;
  date: string;
  parents: string[];
}

export interface Edge {
  source: string;
  target: string;
}

export interface SimNode {
  data: CommitNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned: boolean;
  color: string;
}

export interface CommitGraphProps {
  nodes: CommitNode[];
  edges: Edge[];
  onSelect: (node: CommitNode) => void;
}

// --- CONFIGURATION ---

const CONFIG = {
  REPULSION: 8000,
  SPRING_STIFFNESS: 0.005,
  SPRING_LENGTH: 80,
  CENTER_GRAVITY: 0.01,
  DAMPING: 0.85,
  MAX_SPEED: 8,
  MIN_ZOOM: 0.4,
  MAX_ZOOM: 3,
  FOCUS_ZOOM: 2.2,
};

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

function hashColor(sha: string): string {
  let hash = 0;
  for (let i = 0; i < sha.length; i++) hash = (hash << 5) - hash + sha.charCodeAt(i);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const avatarCache = new Map<string, HTMLImageElement>();
function getAvatarImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  let img = avatarCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    avatarCache.set(url, img);
  }
  return img.complete ? img : null;
}

// --- SUB-COMPONENTS ---

function EmptyState(): React.ReactNode {
  return (
    <div className="w-full h-[500px] md:h-[600px] rounded-2xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
      <svg
        className="w-12 h-12 mb-3 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
      <span className="text-sm font-medium">No commits found for this repository.</span>
    </div>
  );
}

function CommitTooltip({
  node,
  pos,
}: {
  node: SimNode | null;
  pos: { x: number; y: number };
}): React.ReactNode | null {
  if (!node) return null;
  return (
    <div
      className="fixed pointer-events-none bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl max-w-xs z-50 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: pos.x + 16, top: pos.y + 16 }}
    >
      <div className="flex items-center gap-2 mb-1">
        {node.data.avatar && (
          <img
            src={node.data.avatar}
            alt={node.data.author}
            className="w-6 h-6 rounded-full border border-white/20"
          />
        )}
        <div>
          <div className="text-xs font-semibold">{node.data.author}</div>
          <div className="text-[10px] text-gray-400">
            {new Date(node.data.date).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="font-medium text-sm truncate">{node.data.message}</div>
      <div className="text-gray-500 text-[10px] mt-1 font-mono">{node.data.sha.slice(0, 7)}</div>
    </div>
  );
}

function GraphControls({
  selectedSha,
  onClear,
}: {
  selectedSha: string | null;
  onClear: () => void;
}): React.ReactNode {
  return (
    <>
      <div className="absolute bottom-4 left-4 text-xs font-medium text-gray-400 pointer-events-none">
        Drag nodes · Click to inspect · Scroll to zoom · Double-click to focus
      </div>
      {selectedSha && (
        <button
          onClick={onClear}
          className="absolute top-4 right-4 text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-full shadow-md hover:bg-gray-700 transition-colors pointer-events-auto cursor-pointer"
        >
          Clear selection
        </button>
      )}
    </>
  );
}

// --- MAIN GRAPH COMPONENT ---

export function CommitGraph({
  nodes: nodeData,
  edges: edgeData,
  onSelect,
}: CommitGraphProps): React.ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimNode[]>([]);
  const animRef = useRef<number>(0);
  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 1,
    targetZoom: 1,
    panning: false,
    panStartX: 0,
    panStartY: 0,
  });

  const mouseRef = useRef({
    x: 0,
    y: 0,
    down: false,
    dragNode: null as SimNode | null,
    moved: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [hoverNode, setHoverNode] = useState<SimNode | null>(null);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // Refs for rendering inside requestAnimationFrame without triggering re-runs
  const hoverNodeRef = useRef<SimNode | null>(null);
  hoverNodeRef.current = hoverNode;

  const selectedShaRef = useRef<string | null>(null);
  selectedShaRef.current = selectedSha;

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const sx = clientX - rect.left - rect.width / 2 - cam.x * cam.zoom;
    const sy = clientY - rect.top - rect.height / 2 - cam.y * cam.zoom;
    return { x: sx / cam.zoom, y: sy / cam.zoom };
  }, []);

  const getNodeAt = useCallback(
    (clientX: number, clientY: number): SimNode | null => {
      const { x, y } = screenToWorld(clientX, clientY);
      for (const n of simRef.current) {
        const dx = x - n.x;
        const dy = y - n.y;
        // Increased hit radius for easier grab & touch targets
        if (dx * dx + dy * dy < (n.radius + 12) * (n.radius + 12)) return n;
      }
      return null;
    },
    [screenToWorld],
  );

  useEffect(() => {
    if (nodeData.length === 0) return;

    setLoading(true);

    const simNodes: SimNode[] = nodeData.map((n) => ({
      data: n,
      x: Math.random() * 600 - 300,
      y: Math.random() * 400 - 200,
      vx: 0,
      vy: 0,
      radius: 6 + (n.parents.length > 0 ? 2 : 0),
      pinned: false,
      color: hashColor(n.sha),
    }));

    simRef.current = simNodes;

    const nodeMap = new Map<string, SimNode>();
    simNodes.forEach((n) => nodeMap.set(n.data.sha, n));

    const edgeList = edgeData
      .map((e) => ({ source: nodeMap.get(e.source), target: nodeMap.get(e.target) }))
      .filter((e) => e.source && e.target) as { source: SimNode; target: SimNode }[];

    const adjacency = new Map<string, Set<string>>();
    for (const e of edgeList) {
      if (!adjacency.has(e.source.data.sha)) adjacency.set(e.source.data.sha, new Set());
      if (!adjacency.has(e.target.data.sha)) adjacency.set(e.target.data.sha, new Set());
      adjacency.get(e.source.data.sha)!.add(e.target.data.sha);
      adjacency.get(e.target.data.sha)!.add(e.source.data.sha);
    }

    let frame = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = (): void => {
      if (!ctx) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    function simulate(): void {
      const nodes = simRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.pinned) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = CONFIG.REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }

        a.vx += -a.x * CONFIG.CENTER_GRAVITY;
        a.vy += -a.y * CONFIG.CENTER_GRAVITY;
      }

      for (const edge of edgeList) {
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - CONFIG.SPRING_LENGTH;
        const force = displacement * CONFIG.SPRING_STIFFNESS;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!edge.source.pinned) {
          edge.source.vx += fx;
          edge.source.vy += fy;
        }
        if (!edge.target.pinned) {
          edge.target.vx -= fx;
          edge.target.vy -= fy;
        }
      }

      for (const n of nodes) {
        if (n.pinned) continue;
        n.vx *= CONFIG.DAMPING;
        n.vy *= CONFIG.DAMPING;
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > CONFIG.MAX_SPEED) {
          n.vx = (n.vx / speed) * CONFIG.MAX_SPEED;
          n.vy = (n.vy / speed) * CONFIG.MAX_SPEED;
        }
        n.x += n.vx;
        n.y += n.vy;
      }

      frame++;

      if (frame > 300) {
        for (const n of nodes) {
          n.vx *= 0.98;
          n.vy *= 0.98;
        }
      }

      if (frame === 10) setLoading(false);
    }

    function render(): void {
      if (!ctx) return;
      const nodes = simRef.current;
      const w = W();
      const h = H();
      const cam = cameraRef.current;

      cam.zoom += (cam.targetZoom - cam.zoom) * 0.15;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, w, h);
      const gridSize = 28 * cam.zoom;
      ctx.fillStyle = "#e5e7eb";
      const offX = (((w / 2 + cam.x * cam.zoom) % gridSize) + gridSize) % gridSize;
      const offY = (((h / 2 + cam.y * cam.zoom) % gridSize) + gridSize) % gridSize;
      for (let gx = offX; gx < w; gx += gridSize) {
        for (let gy = offY; gy < h; gy += gridSize) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.save();
      ctx.translate(w / 2 + cam.x * cam.zoom, h / 2 + cam.y * cam.zoom);
      ctx.scale(cam.zoom, cam.zoom);

      const selected = selectedShaRef.current;
      const hoverNodeCurrent = hoverNodeRef.current;
      const activeSet = selected ? adjacency.get(selected) : null;

      const isDimmed = (sha: string) => !!selected && sha !== selected && !activeSet?.has(sha);

      ctx.lineWidth = 1.5 / cam.zoom;
      for (const edge of edgeList) {
        const dimmed = isDimmed(edge.source.data.sha) || isDimmed(edge.target.data.sha);
        const highlighted =
          selected && (edge.source.data.sha === selected || edge.target.data.sha === selected);

        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);

        const mx = (edge.source.x + edge.target.x) / 2;
        const my = (edge.source.y + edge.target.y) / 2;
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const nx = -dy;
        const ny = dx;
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        const curve = Math.sin(Date.now() / 2000) * 5;
        const cpx = mx + (nx / len) * curve;
        const cpy = my + (ny / len) * curve;

        ctx.quadraticCurveTo(cpx, cpy, edge.target.x, edge.target.y);
        ctx.strokeStyle = highlighted ? "#3b82f6" : dimmed ? "#f1f5f9" : "#e5e7eb";
        ctx.lineWidth = (highlighted ? 2.5 : 1.5) / cam.zoom;
        ctx.stroke();

        const angle = Math.atan2(edge.target.y - cpy, edge.target.x - cpx);
        const arrowLen = 6 / cam.zoom;
        const tx = edge.target.x - Math.cos(angle) * (edge.target.radius + 2);
        const ty = edge.target.y - Math.sin(angle) * (edge.target.radius + 2);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(
          tx - arrowLen * Math.cos(angle - Math.PI / 7),
          ty - arrowLen * Math.sin(angle - Math.PI / 7),
        );
        ctx.lineTo(
          tx - arrowLen * Math.cos(angle + Math.PI / 7),
          ty - arrowLen * Math.sin(angle + Math.PI / 7),
        );
        ctx.closePath();
        ctx.fillStyle = highlighted ? "#3b82f6" : dimmed ? "#f1f5f9" : "#cbd5e1";
        ctx.fill();
      }

      for (const n of nodes) {
        const dimmed = isDimmed(n.data.sha);
        const isHover = hoverNodeCurrent?.data.sha === n.data.sha;
        const isSelected = selected === n.data.sha;
        const scale = isHover || isSelected ? 1.25 : 1;
        const r = n.radius * scale;

        ctx.globalAlpha = dimmed ? 0.25 : 1;

        if (isHover || isSelected) {
          ctx.save();
          ctx.shadowColor = n.color;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 2, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.fill();
          ctx.restore();
        }

        const avatarImg = getAvatarImage(n.data.avatar);
        if (avatarImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatarImg, n.x - r, n.y - r, r * 2, r * 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? "#111827" : "#ffffff";
        ctx.lineWidth = (isSelected ? 2.5 : 1.5) / cam.zoom;
        ctx.stroke();

        if (n.data.parents.length > 1) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
          ctx.fillStyle = n.color + "30";
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    function tick(): void {
      simulate();
      render();
      animRef.current = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [nodeData, edgeData]); // Removed hoverNode from dependency array to prevent simulation resets

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const node = getNodeAt(e.clientX, e.clientY);
      if (node) {
        node.pinned = true;
        mouseRef.current.dragNode = node;
        mouseRef.current.down = true;
        mouseRef.current.moved = false;
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
      } else {
        cameraRef.current.panning = true;
        cameraRef.current.panStartX = e.clientX - cameraRef.current.x * cameraRef.current.zoom;
        cameraRef.current.panStartY = e.clientY - cameraRef.current.y * cameraRef.current.zoom;
      }
    },
    [getNodeAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const nodeAtCursor = getNodeAt(e.clientX, e.clientY);
      setHoverNode(nodeAtCursor);
      setHoverPos({ x: e.clientX, y: e.clientY });

      const cam = cameraRef.current;

      if (cam.panning) {
        cam.x = (e.clientX - cam.panStartX) / cam.zoom;
        cam.y = (e.clientY - cam.panStartY) / cam.zoom;
        return;
      }

      const node = mouseRef.current.dragNode;
      if (node && mouseRef.current.down) {
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        node.x = x;
        node.y = y;
        if (
          Math.abs(e.clientX - mouseRef.current.x) > 3 ||
          Math.abs(e.clientY - mouseRef.current.y) > 3
        ) {
          mouseRef.current.moved = true;
        }
      }
    },
    [getNodeAt, screenToWorld],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      cameraRef.current.panning = false;
      const node = mouseRef.current.dragNode;
      if (node) {
        node.pinned = false;
        node.vx = 0;
        node.vy = 0;
        mouseRef.current.dragNode = null;
        mouseRef.current.down = false;

        if (!mouseRef.current.moved) {
          setSelectedSha((prev) => (prev === node.data.sha ? null : node.data.sha));
          onSelect(node.data);
        }
      }
    },
    [onSelect],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const node = getNodeAt(e.clientX, e.clientY);
      if (node) {
        cameraRef.current.x = -node.x;
        cameraRef.current.y = -node.y;
        cameraRef.current.targetZoom = CONFIG.FOCUS_ZOOM;
      } else {
        cameraRef.current.targetZoom = 1;
        cameraRef.current.x = 0;
        cameraRef.current.y = 0;
      }
    },
    [getNodeAt],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const cam = cameraRef.current;
    const delta = -e.deltaY * 0.001;
    cam.targetZoom = Math.min(CONFIG.MAX_ZOOM, Math.max(CONFIG.MIN_ZOOM, cam.targetZoom + delta));
  }, []);

  if (nodeData.length === 0) return <EmptyState />;

  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${hoverNode ? "cursor-pointer" : "cursor-grab"} active:cursor-grabbing transition-[filter] duration-150`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      <CommitTooltip node={hoverNode} pos={hoverPos} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 transition-opacity duration-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm font-medium text-gray-600">Building graph...</span>
          </div>
        </div>
      )}

      <GraphControls selectedSha={selectedSha} onClear={() => setSelectedSha(null)} />
    </div>
  );
}
