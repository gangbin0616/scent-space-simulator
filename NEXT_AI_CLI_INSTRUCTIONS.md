# 다음 AI CLI 작업 지시서

이 문서는 다음 AI CLI가 그대로 따라 작업할 수 있도록 만든 구체 지시서입니다.

중요:

- 절대 `C:\Users\admin\Projects\balbam-ai-code`를 수정하지 마세요.
- 작업 위치는 오직 `C:\Users\admin\Projects\scent-space-simulator`입니다.
- 도면은 `FLOORPLAN_SPEC.md`가 기준입니다.
- 시뮬레이션과 360도 뷰어는 반드시 `src/floorplan.js`의 같은 도면 데이터를 사용해야 합니다.
- 도면을 임의로 다시 그리지 마세요. 특히 곡선벽을 동심원 여러 개처럼 만들면 안 됩니다.

## 현재 프로젝트 구조

```txt
C:\Users\admin\Projects\scent-space-simulator
├─ index.html
├─ FLOORPLAN_SPEC.md
├─ WORKPLAN.md
├─ NEXT_AI_CLI_INSTRUCTIONS.md
├─ src
│  ├─ app.js
│  ├─ floorplan.js
│  ├─ simulation.js
│  └─ styles.css
└─ reference-artifacts
```

현재 기능:

- 메인 페이지
- 도면 기반 2.5D/360도 뷰어
- 도면 기반 향 확산 시뮬레이터
- 가벽/서큘레이터/온열/냉각 장치 배치
- 출발점 1개, 도착점 1개
- 향은 벽과 가벽을 통과하지 않음

## 이번에 해야 할 일 요약

아래 기능을 추가하세요.

1. 2.5D 뷰어에 어울리는 이미지/시각 자산 추가
2. 시뮬레이션에서 냉각/난방의 움직임과 역할을 더 명확히 표현
3. 서큘레이터가 뒤에서 공기를 흡입하고 앞으로 내보내는 흐름을 재현
4. 출발점 개수 설정 가능하게 변경, 최대 10개
5. 도착점 개수 설정 가능하게 변경, 최대 10개
6. 각 출발점마다 다른 향을 갖게 만들기
7. 각 향마다 기본 퍼짐/발향량/감쇠 정도를 조절 가능하게 만들기
8. 각 도착점마다 향별 도착 농도를 표시하기

## 작업 순서

반드시 이 순서대로 하세요.

### 1단계. 현재 파일 문법 확인

먼저 아래 명령을 실행하세요.

```powershell
node --check src\floorplan.js
node --check src\simulation.js
node --check src\app.js
```

문법 오류가 있으면 먼저 고치세요.

### 2단계. 도면은 건드리지 말고 데이터 구조부터 바꾸기

`src/floorplan.js`는 최대한 수정하지 마세요.

수정해야 할 중심 파일:

- `src/simulation.js`
- `src/app.js`
- `src/styles.css`
- 필요하면 `index.html`

## 데이터 구조 변경 지시

현재는 `source` 1개, `target` 1개입니다.

아래 구조로 바꾸세요.

```js
let sources = [
  {
    id: "source-1",
    type: "source",
    x: 180,
    y: 720,
    name: "Citrus Opening",
    color: "#d85f37",
    emission: 1.6,
    spread: 1.0,
    decay: 0.006,
  },
];

let targets = [
  {
    id: "target-1",
    type: "target",
    x: 225,
    y: 575,
    name: "메인 체험존",
  },
];
```

규칙:

- `sources.length <= 10`
- `targets.length <= 10`
- 출발점은 각각 다른 향입니다.
- 각 향은 색상도 다르게 보여야 합니다.
- 출발점마다 `emission`, `spread`, `decay`를 조절할 수 있어야 합니다.
- 도착점마다 전체 농도와 향별 농도를 보여야 합니다.

기본 향 프리셋 예시:

```js
const scentPresets = [
  { name: "Citrus Opening", color: "#d85f37", emission: 1.7, spread: 1.12, decay: 0.007 },
  { name: "Floral Heart", color: "#c45d8f", emission: 1.35, spread: 0.96, decay: 0.005 },
  { name: "Woody Base", color: "#7b4f35", emission: 1.05, spread: 0.78, decay: 0.003 },
  { name: "Musk Trail", color: "#6f7890", emission: 0.9, spread: 0.68, decay: 0.0025 },
  { name: "Green Mist", color: "#4f8f6a", emission: 1.2, spread: 1.05, decay: 0.0055 },
];
```

## 시뮬레이션 엔진 변경 지시

현재 `src/simulation.js`는 단일 `Float32Array field`를 사용합니다.

이걸 향별 field로 바꾸세요.

권장 구조:

```js
const fields = new Map();
const buffers = new Map();
```

또는 단순하게:

```js
let fields = sources.map(() => new Float32Array(GRID_SIZE));
let buffers = sources.map(() => new Float32Array(GRID_SIZE));
```

가능하면 `Map<sourceId, Float32Array>` 방식이 좋습니다.

필수 함수 형태:

```js
function ensureFields(sources) {}
function reset(devices, sources) {}
function refreshMask(devices) {}
function inject(source) {}
function step({ sources, devices }) {}
function sampleTarget(target, sources) {}
function draw(ctx, sources) {}
```

`sampleTarget(target, sources)`는 아래 형태를 반환하세요.

```js
{
  total: 0.42,
  bySource: [
    { sourceId: "source-1", name: "Citrus Opening", color: "#d85f37", value: 0.22 },
    { sourceId: "source-2", name: "Woody Base", color: "#7b4f35", value: 0.20 },
  ],
}
```

## 냉각/난방 표현 지시

온열/냉각 장치는 단순 원형 표시만 하면 안 됩니다.

### 온열 장치

시뮬레이션 효과:

- 주변 셀의 확산 속도를 증가시킵니다.
- 주변 셀의 감쇠를 조금 증가시켜 향이 빠르게 퍼지고 빠르게 옅어지는 느낌을 냅니다.

시각 효과:

- 빨간/주황 계열의 위로 올라가는 작은 파동 또는 입자를 그리세요.
- Canvas에서 장치 주변에 반투명 상승선 3~5개를 그리면 됩니다.

예시:

```js
// heater visual
ctx.strokeStyle = "rgba(182,84,50,0.45)";
ctx.beginPath();
ctx.moveTo(device.x - 18, device.y + 28);
ctx.bezierCurveTo(device.x - 30, device.y, device.x - 4, device.y - 20, device.x - 14, device.y - 46);
ctx.stroke();
```

### 냉각 장치

시뮬레이션 효과:

- 주변 셀의 확산 속도를 낮춥니다.
- 감쇠를 낮춰 잔향이 오래 남는 느낌을 냅니다.

시각 효과:

- 청록/파랑 계열의 느린 원형 링 또는 서리 영역을 그리세요.
- 냉각 구역은 향이 천천히 머무는 영역으로 보이면 됩니다.

## 서큘레이터 흡입/토출 표현 지시

중요:

서큘레이터는 뒤에서 공기를 흡입하고 앞쪽으로 내보냅니다.

현재는 앞쪽으로만 밀어내는 느낌입니다. 아래 두 효과를 모두 넣으세요.

### 시뮬레이션 효과

서큘레이터 방향을 `angle`이라고 할 때:

- 앞쪽: `angle` 방향으로 농도를 밀어냄
- 뒤쪽: `angle + Math.PI` 방향에서 농도를 끌어옴

구현 방식:

1. 팬 주변 일정 반경 안의 셀을 확인합니다.
2. 각 셀이 팬 앞쪽인지 뒤쪽인지 판단합니다.
3. 뒤쪽 셀은 팬 중심 쪽으로 살짝 이동시킵니다.
4. 팬 중심 근처 농도는 앞쪽으로 이동시킵니다.

의사코드:

```js
const forward = { x: Math.cos(device.angle), y: Math.sin(device.angle) };
const backward = { x: -forward.x, y: -forward.y };

// 뒤쪽 흡입
// dot(cellVector, backward) > 0.45 이면 흡입 영향권
// cell -> fan center 방향으로 일부 농도 이동

// 앞쪽 토출
// dot(cellVector, forward) > 0.35 이면 토출 영향권
// cell -> forward direction 방향으로 일부 농도 이동
```

### 시각 효과

Canvas에 두 종류의 선을 그리세요.

- 팬 뒤쪽: 팬으로 빨려 들어가는 점선/곡선
- 팬 앞쪽: 팬 밖으로 나가는 부채꼴 바람

색상:

- 흡입: `rgba(80,120,130,0.28)`
- 토출: `rgba(47,111,105,0.34)`

## 출발점 UI 지시

시뮬레이션 페이지 왼쪽 패널에 아래 UI를 추가하세요.

```txt
향 출발점
- + 출발점 추가
- 현재 출발점 목록
  - 향 이름
  - 색상
  - 발향량 emission 슬라이더
  - 퍼짐 spread 슬라이더
  - 감쇠 decay 슬라이더
  - 삭제 버튼
```

규칙:

- 추가 버튼은 10개가 되면 disabled 처리
- 현재 선택된 출발점은 도면에서 강조
- 출발점 도구를 선택하고 도면 클릭 시 새 출발점을 만들거나 선택한 출발점을 이동
- 향 색상은 Canvas 농도 색상과 같아야 함

## 도착점 UI 지시

시뮬레이션 페이지 왼쪽 패널 또는 오른쪽 아래에 아래 UI를 추가하세요.

```txt
도착점
- + 도착점 추가
- 현재 도착점 목록
  - 도착점 이름
  - 전체 농도
  - 향별 농도 막대
  - 삭제 버튼
```

규칙:

- 도착점은 최대 10개
- 도착점마다 `sampleTarget(target, sources)` 결과를 표시
- 도착점 농도 막대는 향 색상별로 나뉘어야 함

예시 표시:

```txt
메인 체험존 42%
Citrus Opening 21%
Floral Heart 13%
Woody Base 8%
```

## 2.5D 뷰어 이미지/시각 자산 지시

현재 360도 뷰어는 도면 기반 raycast로 벽면을 그립니다.

여기에 “2.5D에 어울리는 이미지 느낌”을 추가하세요.

외부 이미지를 무리하게 가져오지 말고, 우선 CSS/Canvas로 아래를 구현하세요.

1. 벽면 세로 그라데이션
2. 선반 라인
3. 향수병 실루엣
4. 바닥 그림자
5. 요소 클릭 마커

가능하면 `src/assets` 폴더를 만들고 아래 SVG 파일을 추가하세요.

```txt
src/assets/perfume-bottle.svg
src/assets/shelf-line.svg
src/assets/warm-panel.svg
src/assets/cool-panel.svg
```

단, 외부 이미지를 hotlink하지 마세요. 네트워크가 끊기면 사이트가 망가집니다.

`drawViewer()` 안에서 벽이 너무 단순한 단색이면 아래처럼 패턴을 추가하세요.

```js
const wallShade = ctx.createLinearGradient(x, y, x, y + wallHeight);
wallShade.addColorStop(0, `rgb(${shade + 16}, ${shade}, ${shade - 10})`);
wallShade.addColorStop(0.55, `rgb(${shade}, ${shade - 20}, ${shade - 34})`);
wallShade.addColorStop(1, `rgb(${shade - 42}, ${shade - 48}, ${shade - 54})`);
ctx.fillStyle = wallShade;
ctx.fillRect(x, y, 2, wallHeight);
```

향수병은 실제 3D가 아니어도 됩니다. 화면 중앙 하단이나 벽면 근처에 거리 기반 크기로 그리면 됩니다.

## 도면/시뮬레이션 정확도 검증

변경 후 반드시 아래 Node smoke test를 다시 실행하세요.

```powershell
@'
import { isWalkable, getWallLines } from './src/floorplan.js';
import { createSimulation } from './src/simulation.js';

const cases = [
  ['upper-left outside', !isWalkable(120, 120)],
  ['main open area', isWalkable(180, 720)],
  ['center inner wall', !isWalkable(360, 650)],
  ['right lower room open', isWalkable(560, 820)],
  ['right long wall', !isWalkable(480, 500)],
  ['curve wall blocks', !isWalkable(78, 743)],
  ['dynamic partition blocks', !isWalkable(205, 650, [{ type:'partition', x:205, y:650, angle:-0.35, length:116, thickness:9 }])],
  ['wall lines available for viewer', getWallLines().length > 45],
];

const sim = createSimulation();
const sources = [
  { id: 's1', x: 180, y: 720, name: 'Citrus', color: '#d85f37', emission: 1.6, spread: 1.0, decay: 0.006 },
];
sim.reset([], sources);
for (let i = 0; i < 900; i += 1) sim.step({ sources, devices: [] });
const result = sim.sampleTarget({ x: 225, y: 575 }, sources);
cases.push(['diffusion reaches target without crossing walls', result.total > 0.00001 && result.total < 10]);

for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(result);
if (cases.some(([, ok]) => !ok)) process.exit(1);
'@ | node --input-type=module
```

만약 기존 `createSimulation()` API를 바꾸면서 위 테스트가 안 맞으면, 테스트 코드를 새 API에 맞게 바꾸되 검증 의미는 유지하세요.

## 브라우저 검증

서버 실행:

```powershell
python -m http.server 4173
```

확인 URL:

```txt
http://127.0.0.1:4173/#home
http://127.0.0.1:4173/#viewer
http://127.0.0.1:4173/#simulator
```

브라우저에서 직접 확인할 것:

- 메인/360도 뷰어/시뮬레이션 페이지 이동 가능
- 360도 뷰어 드래그 시 시야 회전
- 360도 뷰어 미니맵이 현재 위치와 시야 방향 표시
- 시뮬레이션에서 출발점 최대 10개
- 시뮬레이션에서 도착점 최대 10개
- 각 출발점 향 색상이 다름
- 각 출발점의 발향량/퍼짐/감쇠 조절 가능
- 각 도착점에서 향별 농도 표시
- 서큘레이터 흡입/토출 시각화
- 온열/냉각 움직임 시각화
- 향이 벽을 통과하지 않음

## 절대 하지 말 것

- 발밤 프로젝트 수정 금지
- `FLOORPLAN_SPEC.md`와 다른 도면으로 다시 그리기 금지
- 시뮬레이션용 도면과 360도 뷰어용 도면을 따로 만들기 금지
- 향을 단순 직선으로 그리기 금지
- 벽을 통과하는 애니메이션 금지
- 출발점/도착점을 1개로 다시 줄이기 금지
- 외부 이미지 hotlink 금지

## 완료 후 작성할 보고

완료 후 `WORKPLAN.md`에 아래를 추가하세요.

```txt
## 다음 AI CLI 작업 결과

- 다중 출발점 구현 여부
- 다중 도착점 구현 여부
- 향별 농도 구현 여부
- 팬 흡입/토출 구현 여부
- 온열/냉각 움직임 구현 여부
- 2.5D 뷰어 시각 자산 구현 여부
- 실행한 검증 명령
- 남은 문제
```

