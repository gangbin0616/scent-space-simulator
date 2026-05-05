import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Fan,
  Flame,
  MoveRight,
  Play,
  RotateCcw,
  Snowflake,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";

type PointId = "entrance" | "main" | "north" | "east";
type StageId = 1 | 2 | 3 | 4;

const points: Record<PointId, { label: string; x: number; y: number; note: string }> = {
  entrance: { label: "입구", x: 118, y: 900, note: "첫 향을 강하게 인지하는 구간" },
  main: { label: "메인 체험존", x: 220, y: 575, note: "가장 오래 머무는 시향 구간" },
  north: { label: "상단 상담존", x: 404, y: 188, note: "잔향을 안정적으로 남기는 구간" },
  east: { label: "우측 퇴장존", x: 590, y: 770, note: "마지막 인상을 정리하는 구간" },
};

const stages: Array<{
  id: StageId;
  title: string;
  short: string;
  tools: string;
  goal: string;
}> = [
  {
    id: 1,
    title: "가벽만 이용",
    short: "동선 유도",
    tools: "가벽 3개",
    goal: "향이 바로 새지 않도록 체험 동선을 꺾어 체류 시간을 확보합니다.",
  },
  {
    id: 2,
    title: "서큘레이터만 이용",
    short: "바람 방향",
    tools: "저속 팬 2대",
    goal: "향의 출발점에서 도착점 방향으로 일정한 기류를 만듭니다.",
  },
  {
    id: 3,
    title: "온도조절만 이용",
    short: "확산 속도",
    tools: "온열/냉각 존",
    goal: "따뜻한 구간은 확산을 빠르게, 차가운 구간은 향을 붙잡도록 나눕니다.",
  },
  {
    id: 4,
    title: "모든 요소 이용",
    short: "통합 설계",
    tools: "가벽 + 바람 + 온도",
    goal: "도면의 막힌 구간을 피해 향이 도착점까지 가장 안정적으로 이동하게 합니다.",
  },
];

const guideItems = [
  ["향의 시작", "첫 분사 지점은 입구 정면보다 살짝 안쪽에 두어 외부 공기와 섞이는 손실을 줄입니다."],
  ["머무는 벽", "가벽은 막는 장치가 아니라 향이 천천히 돌아가게 만드는 안내선으로 씁니다."],
  ["바람의 세기", "서큘레이터는 강풍보다 저속 연속 바람이 좋습니다. 향이 끊기지 않고 층을 만듭니다."],
  ["온도 레이어", "따뜻한 곳은 발향, 차가운 곳은 잔향 보존에 유리합니다. 한 공간 안에 온도차를 작게 둡니다."],
];

const pointOptions = Object.entries(points) as Array<[PointId, (typeof points)[PointId]]>;

function pathForStage(stage: StageId, start: PointId, end: PointId) {
  const a = points[start];
  const b = points[end];
  const mid =
    stage === 1
      ? `C ${a.x + 20} ${a.y - 180}, 290 610, 310 420 S ${b.x - 70} ${b.y + 60}, ${b.x} ${b.y}`
      : stage === 2
        ? `C ${a.x + 150} ${a.y - 80}, 372 665, 405 520 S ${b.x - 20} ${b.y + 110}, ${b.x} ${b.y}`
        : stage === 3
          ? `C ${a.x + 10} ${a.y - 120}, 170 465, 346 372 S ${b.x - 86} ${b.y + 24}, ${b.x} ${b.y}`
          : `C ${a.x + 88} ${a.y - 135}, 235 610, 334 430 S ${b.x - 55} ${b.y + 74}, ${b.x} ${b.y}`;

  return `M ${a.x} ${a.y} ${mid}`;
}

function FloorPlan({
  stage,
  start,
  end,
  running,
}: {
  stage: StageId;
  start: PointId;
  end: PointId;
  running: boolean;
}) {
  const route = useMemo(() => pathForStage(stage, start, end), [stage, start, end]);
  const showPartitions = stage === 1 || stage === 4;
  const showFans = stage === 2 || stage === 4;
  const showTemp = stage === 3 || stage === 4;

  return (
    <div className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[8px] border border-stone-200 bg-[#fbfaf7] shadow-[0_34px_90px_rgba(36,28,18,0.14)]">
      <svg viewBox="0 0 744 960" className="block aspect-[744/960] w-full" role="img" aria-label="향수 팝업 스토어 평면도 시뮬레이션">
        <defs>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="scentGradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#9f3a2e" />
            <stop offset="0.58" stopColor="#c8754d" />
            <stop offset="1" stopColor="#e7b86f" />
          </linearGradient>
          <radialGradient id="warmZone">
            <stop offset="0" stopColor="#e9a66c" stopOpacity="0.34" />
            <stop offset="1" stopColor="#e9a66c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coolZone">
            <stop offset="0" stopColor="#6aa8a0" stopOpacity="0.28" />
            <stop offset="1" stopColor="#6aa8a0" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="744" height="960" fill="#fbfaf7" />

        {showTemp && (
          <g>
            <circle cx="182" cy="620" r="210" fill="url(#warmZone)" />
            <circle cx="438" cy="236" r="170" fill="url(#coolZone)" />
            <circle cx="596" cy="805" r="130" fill="url(#warmZone)" />
          </g>
        )}

        <g fill="none" stroke="#050505" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M210 307 L210 22 L480 22 L480 826" strokeWidth="12" />
          <path d="M318 188 L318 36 L473 36" strokeWidth="12" />
          <path d="M319 191 L392 191" strokeWidth="12" />
          <path d="M50 949 L50 307 L356 307" strokeWidth="12" />
          <path d="M50 949 L680 949 L680 725 L480 725" strokeWidth="12" />
          <path d="M276 413 L360 413 L360 902" strokeWidth="12" />
          <path d="M478 949 L478 825" strokeWidth="12" />
          <path d="M522 949 L522 914" strokeWidth="12" />
          <path d="M620 949 L620 914 L680 914" strokeWidth="12" />
          <path d="M210 307 L50 307" strokeWidth="12" />
          <path d="M82 718 C73 623 127 543 246 518" strokeWidth="18" />
          <path d="M101 648 C132 596 178 561 227 550" strokeWidth="12" />
          <path d="M132 604 C161 576 194 558 232 550" strokeWidth="8" />
          <path d="M480 186 L480 222" strokeWidth="8" />
          <path d="M480 286 L480 318" strokeWidth="8" />
          <path d="M72 949 L72 916" strokeWidth="22" />
        </g>

        {showPartitions && (
          <g stroke="#8b5543" strokeWidth="10" strokeLinecap="round">
            <path d="M156 768 L282 720" />
            <path d="M245 506 L312 456" />
            <path d="M390 314 L459 314" />
          </g>
        )}

        <path d={route} fill="none" stroke="#e7d2bd" strokeWidth="46" strokeLinecap="round" opacity="0.46" />
        <path d={route} fill="none" stroke="url(#scentGradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray={running ? "20 22" : "2 24"} opacity="0.86">
          {running && <animate attributeName="stroke-dashoffset" from="0" to="-240" dur="4s" repeatCount="indefinite" />}
        </path>

        {running &&
          Array.from({ length: 8 }).map((_, index) => (
            <circle key={index} r={5 + (index % 3)} fill="#bb4b38" opacity="0.78" filter="url(#softGlow)">
              <animateMotion dur={`${5.4 + index * 0.2}s`} begin={`${index * 0.26}s`} repeatCount="indefinite" path={route} />
              <animate attributeName="opacity" values="0;0.86;0.58;0" dur={`${5.4 + index * 0.2}s`} begin={`${index * 0.26}s`} repeatCount="indefinite" />
            </circle>
          ))}

        {showFans && (
          <g>
            <g transform="translate(178 690)">
              <circle r="24" fill="#fff8ef" stroke="#5b3a2e" strokeWidth="3" />
              <path d="M0 -3 C24 -28 36 -3 5 4 C-24 28 -36 3 -5 -4Z" fill="#5b3a2e" opacity="0.82">
                {running && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.2s" repeatCount="indefinite" />}
              </path>
              <path d="M28 -4 C82 -26 121 -28 162 -5" fill="none" stroke="#8bb6aa" strokeWidth="5" strokeLinecap="round" strokeDasharray="8 12">
                {running && <animate attributeName="stroke-dashoffset" from="0" to="-80" dur="1.7s" repeatCount="indefinite" />}
              </path>
            </g>
            <g transform="translate(404 510)">
              <circle r="21" fill="#fff8ef" stroke="#5b3a2e" strokeWidth="3" />
              <path d="M0 -2 C20 -24 33 -2 4 4 C-20 24 -33 2 -4 -4Z" fill="#5b3a2e" opacity="0.82">
                {running && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s" repeatCount="indefinite" />}
              </path>
              <path d="M24 -8 C58 -58 74 -110 55 -176" fill="none" stroke="#8bb6aa" strokeWidth="5" strokeLinecap="round" strokeDasharray="8 12">
                {running && <animate attributeName="stroke-dashoffset" from="0" to="-80" dur="1.7s" repeatCount="indefinite" />}
              </path>
            </g>
          </g>
        )}

        {showTemp && (
          <g fontFamily="Pretendard, sans-serif" fontSize="16" fontWeight="700">
            <g transform="translate(137 595)">
              <Flame size={30} color="#b65432" />
              <text x="36" y="23" fill="#8a3f2c">warm 24°C</text>
            </g>
            <g transform="translate(353 238)">
              <Snowflake size={28} color="#467e78" />
              <text x="34" y="22" fill="#467e78">cool 19°C</text>
            </g>
          </g>
        )}

        {pointOptions.map(([id, point]) => {
          const active = id === start || id === end;
          return (
            <g key={id} transform={`translate(${point.x} ${point.y})`}>
              <circle r={active ? 18 : 12} fill={id === start ? "#9f3a2e" : id === end ? "#2f6f69" : "#f0dcc6"} stroke="#2b211b" strokeWidth="3" />
              <text x="0" y="-26" textAnchor="middle" fontSize="16" fontWeight="800" fill="#2b211b">
                {id === start ? "START" : id === end ? "GOAL" : point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<StageId>(1);
  const [start, setStart] = useState<PointId>("entrance");
  const [end, setEnd] = useState<PointId>("north");
  const [running, setRunning] = useState(true);
  const selectedStage = stages.find((item) => item.id === stage)!;

  return (
    <div className="min-h-screen bg-[#f7f1e8] text-[#201914]">
      <section className="relative isolate min-h-[82svh] overflow-hidden border-b border-[#d7c5af] bg-[#2b211b]">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(18,14,12,0.98),rgba(28,21,17,0.94)_54%,rgba(227,207,180,0.62)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,14,12,0.18),rgba(18,14,12,0.74)_38%,rgba(18,14,12,0.62)_72%,rgba(247,241,232,0.1))] md:hidden" />
        <svg className="absolute inset-y-0 right-0 -z-10 h-full w-[76%] min-w-[860px]" viewBox="0 0 1120 820" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="heroWall" x1="0" x2="1">
              <stop offset="0" stopColor="#2b211b" stopOpacity="0" />
              <stop offset="0.42" stopColor="#8f7a63" stopOpacity="0.58" />
              <stop offset="1" stopColor="#f5eadb" />
            </linearGradient>
            <linearGradient id="glass" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#8f3f32" />
              <stop offset="0.48" stopColor="#d7a66a" />
              <stop offset="1" stopColor="#fff8ec" />
            </linearGradient>
          </defs>
          <rect width="1120" height="820" fill="url(#heroWall)" />
          <path d="M498 128 L1024 128 L1024 666 L498 666Z" fill="#f9efe1" opacity="0.2" />
          <path d="M545 192 H978 M545 334 H978 M545 476 H978" stroke="#4b372b" strokeWidth="10" opacity="0.38" />
          {[610, 696, 782, 868].map((x, index) => (
            <g key={x} transform={`translate(${x} ${index % 2 === 0 ? 284 : 430})`}>
              <rect x="-22" y="-72" width="44" height="96" rx="10" fill="url(#glass)" opacity="0.92" />
              <rect x="-12" y="-94" width="24" height="24" rx="5" fill="#3a2a22" />
              <rect x="-28" y="-18" width="56" height="34" rx="4" fill="#fff8ec" opacity="0.58" />
            </g>
          ))}
          <path d="M520 666 C650 612 822 610 1040 668 L1040 820 L520 820Z" fill="#201914" opacity="0.34" />
          <path d="M432 122 C514 224 540 382 498 666" fill="none" stroke="#120f0d" strokeWidth="20" opacity="0.42" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-[#f7f1e8] to-transparent" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 text-white md:px-8">
          <div className="shrink-0 font-serif text-2xl font-semibold tracking-wide">Scent Space</div>
          <a href="#simulation" aria-label="시뮬레이션 열기" className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/12 text-xs font-semibold backdrop-blur transition hover:bg-white/20 sm:w-auto sm:px-4 sm:text-sm">
            <span className="hidden sm:inline">시뮬레이션 열기</span>
            <ArrowRight size={16} />
          </a>
        </nav>

        <div className="mx-auto flex min-h-[calc(82svh-76px)] max-w-7xl items-center px-5 py-16 md:px-8">
          <motion.div initial={{ opacity: 1, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl text-white">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-[#f2c98e] sm:text-sm">Perfume Popup Flow Guide</p>
            <h1 className="max-w-[22rem] font-serif text-[2.7rem] font-semibold leading-[1.08] text-[#fffaf2] drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:max-w-none sm:text-5xl md:text-7xl">
              향이 길을 잃지 않는
              <br />
              팝업 스토어 설계
            </h1>
            <p className="mt-6 max-w-[21rem] text-base font-medium leading-7 text-[#fffaf2]/92 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:max-w-2xl sm:text-lg sm:leading-8">
              향수 팝업을 여는 사람을 위해 동선, 가벽, 바람, 온도를 한 화면에서 확인하고 제공된 평면도 위에서 향의 출발점과 도착점을 직접 실험합니다.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.26em] text-[#9f3a2e]">Design Guide</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight md:text-5xl">사진과 선택 요소가 따로 놀지 않도록, 모든 판단을 공간 조건에 연결합니다.</h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[8px] border border-[#d7c5af] bg-[#d7c5af] md:grid-cols-2">
          {guideItems.map(([title, body]) => (
            <div key={title} className="bg-[#fffaf2] p-7">
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-4 leading-7 text-[#6b5a4a]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="simulation" className="border-y border-[#d7c5af] bg-[#efe3d3] px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.26em] text-[#9f3a2e]">Interactive Simulator</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold">도면 기반 향 확산 실험</h2>
              <p className="mt-4 leading-7 text-[#6b5a4a]">
                아래 단계는 서로 다른 제약 조건입니다. 출발점과 도착점을 바꾸면 같은 도면에서도 필요한 장치가 달라집니다.
              </p>
            </div>

            <div className="rounded-[8px] border border-[#d7c5af] bg-[#fffaf2] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold">단계 선택</span>
                <span className="text-xs font-bold text-[#9f3a2e]">{selectedStage.tools}</span>
              </div>
              <div className="grid gap-2">
                {stages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStage(item.id)}
                    className={`flex items-center justify-between rounded-[8px] border px-4 py-3 text-left transition ${
                      stage === item.id ? "border-[#9f3a2e] bg-[#f3d8c4]" : "border-[#e6d8c8] bg-white hover:border-[#b98c71]"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-black">0{item.id}. {item.title}</span>
                      <span className="text-xs text-[#7b6756]">{item.short}</span>
                    </span>
                    <MoveRight size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-[8px] border border-[#d7c5af] bg-[#fffaf2] p-4">
              <label className="text-sm font-bold" htmlFor="start-point">향수 출발점</label>
              <select id="start-point" value={start} onChange={(event) => setStart(event.target.value as PointId)} className="rounded-[8px] border border-[#d7c5af] bg-white px-3 py-3 font-semibold">
                {pointOptions.map(([id, point]) => (
                  <option key={id} value={id}>{point.label}</option>
                ))}
              </select>
              <label className="mt-2 text-sm font-bold" htmlFor="end-point">향수 도착점</label>
              <select id="end-point" value={end} onChange={(event) => setEnd(event.target.value as PointId)} className="rounded-[8px] border border-[#d7c5af] bg-white px-3 py-3 font-semibold">
                {pointOptions.map(([id, point]) => (
                  <option key={id} value={id}>{point.label}</option>
                ))}
              </select>
            </div>

            <div className="rounded-[8px] border border-[#d7c5af] bg-[#201914] p-5 text-white">
              <div className="flex items-center gap-2 text-[#f2c98e]">
                {stage === 1 && <Sparkles size={18} />}
                {stage === 2 && <Fan size={18} />}
                {stage === 3 && <Thermometer size={18} />}
                {stage === 4 && <Wind size={18} />}
                <span className="text-sm font-bold">현재 목표</span>
              </div>
              <p className="mt-3 leading-7 text-white/82">{selectedStage.goal}</p>
              <button
                type="button"
                onClick={() => setRunning((value) => !value)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f2c98e] px-4 py-2 text-sm font-black text-[#201914] transition hover:bg-[#ffdca2]"
              >
                {running ? <RotateCcw size={16} /> : <Play size={16} />}
                {running ? "일시 정지" : "시뮬레이션 시작"}
              </button>
            </div>
          </aside>

          <div>
            <FloorPlan stage={stage} start={start} end={end} running={running} />
            <div className="mt-4 grid gap-3 text-sm text-[#6b5a4a] md:grid-cols-2">
              <p className="rounded-[8px] border border-[#d7c5af] bg-[#fffaf2] p-4">
                출발: <strong className="text-[#201914]">{points[start].label}</strong> · {points[start].note}
              </p>
              <p className="rounded-[8px] border border-[#d7c5af] bg-[#fffaf2] p-4">
                도착: <strong className="text-[#201914]">{points[end].label}</strong> · {points[end].note}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
