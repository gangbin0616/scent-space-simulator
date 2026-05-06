# 3D Viewer AI Handoff Prompt

이 문서는 `scent-space-simulator` 프로젝트의 3D 뷰어 부분만 다른 AI에게 맡기기 위한 상세 인수인계 문서입니다.

## 프로젝트 개요

현재 만들고 있는 것은 향수 팝업 스토어 공간 설계 시뮬레이터입니다.

앱 이름은 `ScentMaze`입니다. 사용자는 도면 위에 향 출발점, 도착점, 가벽, 서큘레이터, 온열 장치, 냉각 장치를 배치하고 향이 공간 안에서 어떻게 퍼지는지 확인합니다. 같은 도면 데이터를 기반으로 공간을 걸어 다니듯 보는 3D 뷰어도 제공합니다.

중요한 점은 시뮬레이터와 3D 뷰어가 반드시 같은 도면 좌표계와 벽 데이터를 사용해야 한다는 것입니다. 3D 뷰어는 독립된 장식 페이지가 아니라, 도면 기반 공간 설계를 더 직관적으로 이해하게 해주는 보조 뷰입니다.

## 현재 3D 뷰어의 실제 구현 상태

현재 이름은 UI상 `3D 뷰어`지만, 기술적으로는 진짜 WebGL/Three.js 3D가 아닙니다. `src/app.js` 안에 구현된 2.5D raycast 캔버스 뷰어입니다.

핵심 파일:

- `index.html`
  - `viewerCanvas`: 큰 3D/360 뷰 캔버스입니다.
  - `viewerMapCanvas`: 오른쪽 미니맵 캔버스입니다.
  - `viewerInfo`: 뷰어에서 클릭한 오브젝트 설명 패널입니다.
  - `data-camera` 버튼들: 입구, 곡선 벽, 메인 체험존, 상단 상담존, 우측 하단 바 같은 프리셋 시점을 바꿉니다.

- `src/app.js`
  - `viewer` 객체: 카메라 좌표, yaw, pitch, 드래그 상태, 키 입력 상태를 저장합니다.
  - `cameras`: 프리셋 카메라 위치와 방향입니다.
  - `viewerElements`: 3D 뷰 안에 표시되는 오브젝트 목록입니다.
  - `raySegmentHit`, `castRayHit`, `castRay`: 도면 벽에 대한 raycast 계산입니다.
  - `canViewerStandAt`, `moveViewerCamera`, `updateViewerMovement`: WASD 이동과 충돌 처리입니다.
  - `drawViewerWallStripe`: 레이캐스트로 찾은 벽을 세로 stripe로 그립니다.
  - `drawCeilingLights`, `drawMuralPanel`, `drawShelfDisplay`, `drawWallObject`: 조명과 오브젝트 sprite를 캔버스에 그립니다.
  - `drawViewer`: 큰 뷰어 캔버스 전체를 그리는 메인 렌더 함수입니다.
  - `drawViewerMap`: 미니맵 캔버스를 그립니다.
  - `initViewer`: 버튼, 마우스 드래그, 클릭, 키보드 이벤트를 연결합니다.

- `src/floorplan.js`
  - `PLAN_WIDTH`, `PLAN_HEIGHT`: 전체 도면 크기입니다.
  - `wallSegmentDefs`, `curvedWalls`, `wallBlocks`: 고정 벽 데이터입니다.
  - `getWallLines(devices)`: 현재 활성 벽과 사용자가 추가한 가벽을 선분 목록으로 반환합니다.
  - `isWalkable(x, y, devices)`: 특정 좌표에 사람이 설 수 있는지 판단합니다.
  - `drawFloorPlan(ctx, devices)`: 미니맵과 시뮬레이터에서 같은 도면을 그립니다.

## 현재 뷰어 동작 방식

1. `viewer.camera`는 도면 좌표계의 현재 카메라 위치입니다.
2. `viewer.yaw`는 좌우 회전 각도입니다.
3. `viewer.pitch`는 상하 시선 각도입니다.
4. `drawViewer()`는 캔버스 가로 방향으로 2px 단위 ray를 쏩니다.
5. 각 ray는 `getWallLines(devices)`에서 가져온 벽 선분과 교차 계산을 합니다.
6. 가장 가까운 벽까지의 거리를 기반으로 벽 높이와 밝기를 계산합니다.
7. `drawViewerWallStripe()`가 벽을 세로 stripe처럼 그립니다.
8. 바닥과 천장은 그라디언트와 perspective 선으로 가짜 3D 느낌을 냅니다.
9. `viewerElements`에 정의된 오브젝트는 거리, yaw, 벽 가림 여부를 계산한 뒤 sprite로 그립니다.
10. 미니맵은 같은 도면을 축소해서 그리고, 카메라 위치와 방향선을 표시합니다.

## 현재 가능한 조작

- 마우스 드래그: 시야 회전
- `W`: 전진
- `S`: 후진
- `A`: 왼쪽 strafing
- `D`: 오른쪽 strafing
- 방향키 좌우: yaw 회전
- 방향키 위아래: 전진/후진
- 프리셋 버튼: 특정 위치로 카메라 이동
- 뷰어 오브젝트 클릭: 오른쪽 설명 패널 업데이트

## 현재 한계

현재 뷰어는 실제 3D가 아니라 raycast 기반 2.5D입니다. 그래서 다음 한계가 있습니다.

- 벽이 실제 3D mesh가 아니라 세로 stripe입니다.
- 바닥, 천장, 오브젝트가 실제 깊이 있는 3D geometry가 아닙니다.
- 오브젝트는 sprite처럼 그려지므로 카메라 방향에 따라 입체적으로 회전하지 않습니다.
- 가벽, 온열 장치, 냉각 장치 등 시뮬레이터에서 사용자가 배치한 장치가 3D 뷰어에 실시간으로 자연스럽게 반영되는 수준이 아직 제한적입니다.
- 현재 텍스트 일부는 인코딩 문제로 깨져 보이는 부분이 있습니다. 3D 뷰어 개선 중 이 문제를 악화시키면 안 됩니다.

## 내가 요청하는 작업

3D 뷰어 부분만 개선해 주세요. 목표는 사용자가 향수 팝업 매장을 실제로 걷는 느낌을 더 강하게 받도록 만드는 것입니다.

원하는 방향:

1. 현재 2.5D raycast 구조를 개선하거나, 필요하면 Three.js 기반 실제 3D 뷰어로 전환합니다.
2. 도면 좌표계와 벽 데이터는 반드시 `src/floorplan.js`를 기준으로 사용합니다.
3. 시뮬레이터의 도면과 3D 뷰어의 공간 구조가 서로 어긋나면 안 됩니다.
4. 벽 너머가 보이면 안 됩니다.
5. 이동 충돌은 `isWalkable()` 또는 같은 기준의 충돌 로직을 사용해야 합니다.
6. 사용자가 시뮬레이터에서 배치한 가벽이 3D 뷰어에도 반영되어야 합니다.
7. 향수 팝업 매장처럼 보여야 합니다. 단순한 검은 벽 미로처럼 보이면 안 됩니다.
8. 입구, 벽면 이미지, 선반, 온열 장치, 냉각 장치, 서큘레이터 같은 요소가 공간 안에서 알아볼 수 있게 보여야 합니다.
9. 미니맵은 유지해야 합니다.
10. WASD 이동과 마우스 드래그 회전은 유지해야 합니다.

## 절대 명령

다른 AI는 아래 명령을 반드시 지켜야 합니다.

1. 3D 뷰어와 직접 관련 없는 기능을 건드리지 마세요.
2. 향 확산 시뮬레이션 로직을 임의로 바꾸지 마세요.
3. 온열/냉각 범위 UI, 향 색상 변화, 시뮬레이터 조작 UI를 망가뜨리지 마세요.
4. `src/floorplan.js`의 도면 좌표계를 무시하고 새 좌표계를 만들지 마세요.
5. 벽 데이터와 충돌 데이터를 따로 복제해서 관리하지 마세요. 가능하면 `getWallLines()`, `isWalkable()`, `drawFloorPlan()` 같은 기존 API를 재사용하세요.
6. 기존 라우팅 `#home`, `#simulator`, `#viewer`를 깨지 마세요.
7. `index.html`의 전체 앱 구조를 랜딩 페이지처럼 갈아엎지 마세요.
8. 카드형 홍보 페이지를 만들지 마세요. 실제 사용 가능한 뷰어가 첫 목표입니다.
9. 텍스트가 깨진 부분을 만지다가 더 많은 문법 오류를 만들지 마세요.
10. 작업 후 반드시 `node --check src/app.js`와 `node --check src/simulation.js`를 실행하세요.
11. 가능하면 브라우저에서 `http://127.0.0.1:4173/#viewer`를 열어 확인하세요.
12. 커밋이 필요한 상황이면 뷰어 관련 변경만 커밋하세요.

## 추천 구현 방향

선택지는 두 가지입니다.

### 선택지 A: 현재 2.5D raycast를 고도화

작업 범위가 작고 안전합니다.

- 벽 stripe를 더 자연스러운 벽면 패널처럼 보이게 개선
- 바닥 perspective와 천장 조명 강화
- 오브젝트 sprite를 더 고급스럽게 개선
- 미니맵과 카메라 표시 개선
- 동적 가벽, 온열/냉각/서큘레이터 표시 개선
- 깊이 정렬과 가림 처리를 더 정확하게 개선

### 선택지 B: Three.js 기반 실제 3D 뷰어로 전환

품질은 더 좋아질 수 있지만 작업량과 리스크가 큽니다.

- `floorplan.js`의 벽 선분을 Three.js wall mesh로 변환
- 바닥 plane 생성
- 카메라를 도면 좌표에 맞춰 배치
- 벽 충돌은 기존 `isWalkable()` 기준 유지
- 오브젝트는 간단한 mesh 또는 billboard sprite로 배치
- 미니맵은 기존 canvas 방식을 유지하거나 overlay로 유지
- 기존 `viewerCanvas`에 WebGLRenderer를 붙이거나, HTML 구조를 최소 변경해서 renderer canvas를 삽입

실제 3D로 전환할 때도 절대 지켜야 할 점:

- 도면 좌표와 3D 좌표 변환 함수를 명확히 만들 것
- 3D 좌표의 기준 축을 문서화할 것
- 기존 시뮬레이터와 데이터 흐름을 분리하지 말 것
- 빈 화면, 검은 화면, 카메라가 벽 밖에 갇히는 상태를 만들지 말 것

## 검증 체크리스트

작업 후 아래를 확인해야 합니다.

- `node --check src/app.js`
- `node --check src/simulation.js`
- `python -m http.server 4173`
- `http://127.0.0.1:4173/#viewer` 접속
- viewer 페이지가 빈 화면이 아닌지 확인
- 마우스 드래그로 시야가 움직이는지 확인
- WASD 이동이 되는지 확인
- 벽을 통과하지 않는지 확인
- 프리셋 버튼들이 작동하는지 확인
- 미니맵의 카메라 위치와 방향이 실제 뷰와 맞는지 확인
- 뷰어 오브젝트 클릭 시 설명 패널이 깨지지 않는지 확인
- `#simulator` 페이지의 향 확산, 온열/냉각 UI가 여전히 작동하는지 확인

## 다른 AI에게 보낼 프롬프트

아래 프롬프트를 그대로 복사해서 다른 AI에게 전달하세요.

```text
너는 기존 웹앱의 3D 뷰어 부분만 개선하는 프론트엔드/그래픽 엔지니어다.

프로젝트는 `ScentMaze`라는 향수 팝업 스토어 공간 설계 시뮬레이터다. 사용자는 도면 위에 향 출발점, 도착점, 가벽, 서큘레이터, 온열 장치, 냉각 장치를 배치하고 향이 공간 안에서 어떻게 퍼지는지 확인한다. 같은 도면 데이터를 기반으로 향수 매장 안을 걷는 듯한 3D 뷰어도 제공한다.

작업 디렉터리는 `C:\Users\admin\Projects\scent-space-simulator`다.

현재 3D 뷰어는 실제 Three.js 3D가 아니라 `src/app.js` 안에 구현된 2.5D raycast canvas 뷰어다. `viewerCanvas`에 벽을 raycast stripe로 그리고, `viewerMapCanvas`에 미니맵을 그린다. 도면과 벽 데이터는 `src/floorplan.js`에 있고, 반드시 이 데이터를 기준으로 해야 한다.

관련 파일:
- `index.html`: viewer 페이지 HTML, `viewerCanvas`, `viewerMapCanvas`, 프리셋 버튼, 정보 패널
- `src/app.js`: 현재 viewer 로직 대부분
- `src/floorplan.js`: 도면 좌표, 벽 데이터, `getWallLines()`, `isWalkable()`, `drawFloorPlan()`
- `src/styles.css`: viewer 레이아웃 스타일

현재 뷰어 핵심 함수:
- `drawViewer()`: 큰 뷰어 렌더링
- `drawViewerMap()`: 미니맵 렌더링
- `initViewer()`: 입력 이벤트 연결
- `castRayHit()`, `raySegmentHit()`: 벽 레이캐스트
- `canViewerStandAt()`: 충돌 판정
- `drawWallObject()`: 오브젝트 sprite 렌더링

요청:
3D 뷰어 부분만 개선해라. 목표는 사용자가 향수 팝업 매장을 실제로 걷는 느낌을 더 강하게 받게 하는 것이다. 현재 2.5D raycast를 고도화해도 되고, 리스크를 감당할 수 있으면 Three.js 기반 실제 3D로 전환해도 된다. 단, 도면 좌표계와 벽 충돌은 반드시 기존 `floorplan.js` 기준을 사용해야 한다.

절대 명령:
1. 3D 뷰어와 직접 관련 없는 기능을 건드리지 마라.
2. 향 확산 시뮬레이션 로직을 임의로 바꾸지 마라.
3. 온열/냉각 범위 UI와 향 색상 변화 기능을 깨뜨리지 마라.
4. `src/floorplan.js`의 도면 좌표계를 무시하고 새 좌표계를 만들지 마라.
5. 벽 데이터와 충돌 데이터를 따로 복제해서 관리하지 마라. 가능하면 `getWallLines()`, `isWalkable()`, `drawFloorPlan()`을 재사용해라.
6. 기존 라우팅 `#home`, `#simulator`, `#viewer`를 깨지 마라.
7. 앱 전체를 랜딩 페이지처럼 갈아엎지 마라.
8. viewer가 빈 화면, 검은 화면, 벽 밖 카메라, 조작 불능 상태가 되면 실패다.
9. 텍스트 인코딩이 일부 깨져 있을 수 있으니 문자열을 광범위하게 건드리지 마라.
10. 작업 후 반드시 `node --check src/app.js`와 `node --check src/simulation.js`를 실행해라.

구현 목표:
- 뷰어가 더 입체적이고 매장처럼 보여야 한다.
- 벽, 바닥, 천장, 조명, 벽면 이미지, 선반, 입구, 온열/냉각 장치, 서큘레이터가 더 잘 보여야 한다.
- WASD 이동과 마우스 드래그 회전을 유지해야 한다.
- 미니맵을 유지해야 한다.
- 벽 너머가 보이면 안 된다.
- 사용자가 추가한 가벽이 3D 뷰어에도 반영되어야 한다.
- 프리셋 카메라 버튼이 계속 작동해야 한다.

검증:
1. `node --check src/app.js`
2. `node --check src/simulation.js`
3. `python -m http.server 4173`
4. 브라우저에서 `http://127.0.0.1:4173/#viewer` 확인
5. WASD 이동, 마우스 드래그, 프리셋 버튼, 미니맵, 오브젝트 클릭 확인
6. `http://127.0.0.1:4173/#simulator`에서 향 확산과 온열/냉각 UI가 깨지지 않았는지 확인

가능하면 변경 내용을 작게 나누고, 3D 뷰어 관련 파일만 수정해라.
```

