import { useRef, useEffect, useCallback, useState } from "react";

interface CommitNode {
  sha: string;
  message: string;
  author: string;
  avatar: string;
  date: string;
  parents: string[];
}

interface Edge {
  source: string;
  target: string;
}

interface SimNode {
  data: CommitNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned: boolean;
  color: string;
}

interface CommitGraphProps {
  nodes: CommitNode[];
  edges: Edge[];
  onSelect: (node: CommitNode) => void;
}

// Updated to brighter, distinct colors for better visibility
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

function hashColor(sha: string) {
  let hash = 0;
  for (let i = 0; i < sha.length; i++) hash = (hash << 5) - hash + sha.charCodeAt(i);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function CommitGraph({ nodes: nodeData, edges: edgeData, onSelect }: CommitGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimNode[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({
    x: 0,
    y: 0,
    down: false,
    dragNode: null as SimNode | null,
    moved: false,
  });
  const [loading, setLoading] = useState(true);
  const [hoverNode, setHoverNode] = useState<SimNode | null>(null);

  useEffect(() => {
    if (nodeData.length === 0) return;

    setLoading(true);

    const simNodes: SimNode[] = nodeData.map((n, i) => ({
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

    let frame = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      if (!ctx) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // Logic remains completely unchanged
    const REPULSION = 8000;
    const SPRING_STIFFNESS = 0.005;
    const SPRING_LENGTH = 80;
    const CENTER_GRAVITY = 0.01;
    const DAMPING = 0.85;
    const MAX_SPEED = 8;

    function simulate() {
      const nodes = simRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.pinned) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }

        a.vx += -a.x * CENTER_GRAVITY;
        a.vy += -a.y * CENTER_GRAVITY;
      }

      for (const edge of edgeList) {
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - SPRING_LENGTH;
        const force = displacement * SPRING_STIFFNESS;
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
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > MAX_SPEED) {
          n.vx = (n.vx / speed) * MAX_SPEED;
          n.vy = (n.vy / speed) * MAX_SPEED;
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

    // UI drawing updated for cleaner look
    function render() {
      if (!ctx) return;
      const nodes = simRef.current;
      const w = W();
      const h = H();

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);

      ctx.lineWidth = 1.5;
      for (const edge of edgeList) {
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
        ctx.strokeStyle = "#e5e7eb"; // Cleaner edge color
        ctx.stroke();
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (n.data.parents.length > 1) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
          ctx.fillStyle = n.color + "30";
          ctx.fill();
        }
      }

      ctx.restore();
    }

    function tick() {
      simulate();
      render();
      animRef.current = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [nodeData, edgeData]);

  const getNodeAt = useCallback((mx: number, my: number): SimNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = mx - rect.left - rect.width / 2;
    const y = my - rect.top - rect.height / 2;
    for (const n of simRef.current) {
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy < (n.radius + 8) * (n.radius + 8)) return n;
    }
    return null;
  }, []);

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
      }
    },
    [getNodeAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const nodeAtCursor = getNodeAt(e.clientX, e.clientY);
      setHoverNode(nodeAtCursor);

      const node = mouseRef.current.dragNode;
      if (node && mouseRef.current.down) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        node.x = e.clientX - rect.left - rect.width / 2;
        node.y = e.clientY - rect.top - rect.height / 2;
        if (
          Math.abs(e.clientX - mouseRef.current.x) > 3 ||
          Math.abs(e.clientY - mouseRef.current.y) > 3
        ) {
          mouseRef.current.moved = true;
        }
      }
    },
    [getNodeAt],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const node = mouseRef.current.dragNode;
      if (node) {
        node.pinned = false;
        node.vx = 0;
        node.vy = 0;
        mouseRef.current.dragNode = null;
        mouseRef.current.down = false;

        if (!mouseRef.current.moved) {
          onSelect(node.data);
        }
      }
    },
    [onSelect],
  );

  if (nodeData.length === 0) return null;

  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* UI overlay for better text visibility */}
      {hoverNode && (
        <div className="absolute top-4 left-4 pointer-events-none bg-gray-900 text-white rounded-lg px-4 py-2 shadow-lg max-w-sm">
          <div className="font-medium text-sm truncate">{hoverNode.data.message}</div>
          <div className="text-gray-400 text-xs mt-1">by {hoverNode.data.author}</div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 transition-opacity duration-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm font-medium text-gray-600">Building graph...</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 text-xs font-medium text-gray-400 pointer-events-none">
        Drag nodes · Click to inspect
      </div>
    </div>
  );
}
