# 360도 뷰 연구와 구현 방향

이 문서는 현재 프로젝트의 도면 기반 2.5D 뷰어를 어떻게 발전시키면 덜 어색하고 더 설득력 있는 360도 경험이 되는지 정리한 문서입니다.

## 현재 방식

현재 뷰어는 `src/floorplan.js`의 `getWallLines()`를 기반으로 Canvas raycast를 수행합니다. 각 화면 x 좌표마다 하나의 ray를 쏘고, 가장 가까운 벽과의 거리를 계산해 세로 벽면 stripe를 그립니다.

장점:

- 도면과 정확히 연결됩니다.
- 별도 3D 모델이 없어도 빠르게 동작합니다.
- 시뮬레이터와 같은 좌표계를 사용하므로 불일치가 적습니다.

한계:

- 실제 360도 사진처럼 상하 시야가 풍부하지 않습니다.
- 벽 높이가 모두 같아 보이면 게임 프로토타입처럼 느껴질 수 있습니다.
- 바닥과 천장이 단순 그라데이션이면 깊이감이 약합니다.
- 선반, 향수병, 장치가 거리와 가림 관계를 충분히 반영하지 않으면 떠 보입니다.

## 참고 자료 요약

### Raycasting 기본

Lode Vandevenne의 raycasting tutorial은 2D map에서 ray를 쏘고, 각 vertical screen stripe에 벽 높이를 투영하는 기본 구조를 설명합니다.

적용 포인트:

- 현재 프로젝트처럼 도면 데이터가 2D일 때 적합합니다.
- 벽은 화면 세로 줄 단위로 그리는 방식이 성능상 유리합니다.
- 어색함을 줄이려면 거리 보정, 벽 텍스처, floor/ceiling 처리가 중요합니다.

자료:

- https://lodev.org/cgtutor/raycasting.html
- https://lodev.org/cgtutor/raycasting2.html
- https://lodev.org/cgtutor/raycasting3.html

### Floor / Ceiling casting

Lode의 floor and ceiling 글은 벽처럼 세로 stripe로 그릴 수 없는 바닥과 천장을 horizontal scanline 방식으로 계산하는 접근을 설명합니다.

적용 포인트:

- 지금처럼 바닥이 단순 그라데이션이면 거리감이 약합니다.
- 바닥 패턴, 그림자, 동선 라인을 perspective에 맞게 넣으려면 floor casting이 필요합니다.
- 향수 팝업 공간에서는 바닥 질감보다 낮은 대비의 패턴과 그림자가 더 중요합니다.

### Sprite 방식

Raycasting III는 벽/바닥이 아닌 물체를 sprite로 투영하는 방식을 설명합니다.

적용 포인트:

- 향수병, 선반, 온열/냉각 장치, 클릭 마커는 sprite 방식이 자연스럽습니다.
- sprite는 거리순으로 정렬해서 먼 것부터 그려야 합니다.
- 벽 뒤에 있는 sprite는 ray distance와 비교해 숨겨야 합니다.

### Three.js equirectangular panorama

Three.js 공식 예제는 equirectangular panorama 이미지를 안쪽으로 뒤집은 sphere에 매핑해 360도 이미지를 보여주는 방식을 사용합니다.

적용 포인트:

- 실제 사진 또는 렌더 이미지가 있다면 이 방식이 가장 자연스럽습니다.
- 현재 도면 기반 raycast와는 성격이 다릅니다. 사진 기반 viewer는 현실감이 좋고, 도면 기반 viewer는 배치 정확도가 좋습니다.
- 장기적으로는 "도면 기반 2.5D 모드"와 "사진/렌더 기반 panorama 모드"를 분리하는 것이 좋습니다.

자료:

- https://threejs.org/examples/webgl_panorama_equirectangular.html

### Panolens.js

Panolens.js는 Three.js 기반 panorama viewer입니다. 이미지 panorama와 viewer를 만들고 여러 panorama를 link할 수 있습니다. 다만 원본 저장소는 archived 상태입니다.

적용 포인트:

- 빠른 panorama prototype에는 참고할 만합니다.
- 새 기능을 얹는 장기 기반으로는 archived 상태를 고려해야 합니다.
- viewer 간 link 개념은 "팝업 공간 내 지점 이동"에 참고할 수 있습니다.

자료:

- https://github.com/pchen66/panolens.js

### Pannellum

Pannellum은 WebGL 기반 오픈소스 panorama viewer입니다. equirectangular, cubemap, multiresolution format을 지원합니다.

적용 포인트:

- 고해상도 panorama는 단일 이미지보다 multiresolution tile이 적합합니다.
- 웹 서버에서 정적 파일로 배포하기 쉬운 편입니다.
- 실제 촬영 이미지 또는 AI/3D 렌더 panorama를 붙일 경우 후보가 됩니다.

자료:

- https://pannellum.org/
- https://pannellum.org/documentation/overview/
- https://pannellum.org/documentation/examples/multiresolution/

### Photo Sphere Viewer

Photo Sphere Viewer는 Three.js를 기반으로 equirectangular, cubemap, video, marker system 등을 지원합니다.

적용 포인트:

- hotspot/marker가 필요하면 직접 구현보다 빠를 수 있습니다.
- touch, gyroscope, plugin 구조가 있어 모바일/전시용 viewer 확장에 유리합니다.
- 현재 앱이 정적 파일 기반이라 라이브러리 도입 시 dependency 관리 방식을 먼저 정해야 합니다.

자료:

- https://photo-sphere-viewer.js.org/
- https://photo-sphere-viewer.js.org/guide/

### Cubemap to Equirectangular

`THREE.CubemapToEquirectangular`는 Three.js scene에서 equirectangular panorama를 추출하는 helper입니다.

적용 포인트:

- 3D로 팝업 공간을 만든 뒤 각 지점에서 panorama 이미지를 bake하는 파이프라인을 만들 수 있습니다.
- 도면 기반 2.5D를 넘어서 실제 panorama asset을 만들 때 참고할 수 있습니다.

자료:

- https://github.com/spite/THREE.CubemapToEquirectangular

## 안 어색하게 만드는 기준

### 1. 카메라 높이를 고정한다

팝업 공간 viewer는 사람 눈높이 기준으로 보여야 합니다. 현재 2.5D 방식에서는 실제 z축이 없으므로 다음을 고정값으로 둡니다.

- eye height: 약 150~165cm 느낌
- horizon: 화면 중앙보다 약간 위
- wall height projection: 너무 높게 늘어나지 않게 clamp

### 2. 벽은 단색이 아니라 소재 레이어를 가진다

벽면이 단색이면 도면 projection이 바로 티가 납니다.

권장 레이어:

- 상단/중단/하단 세로 그라데이션
- 아주 약한 vertical seam
- 선반 라인
- 가까운 벽의 ambient shadow
- 벽 하단 contact shadow

### 3. 바닥이 깊이감을 책임져야 한다

사람은 바닥 패턴과 그림자로 깊이를 많이 판단합니다.

우선순위:

- 바닥 그라데이션
- 카메라 앞쪽 타원형 그림자
- 바닥 scanline 또는 낮은 대비 패턴
- 장치/병 아래 contact shadow

### 4. sprite는 거리순, 가림순으로 그린다

향수병이나 장치가 벽보다 앞에 떠 보이면 어색합니다.

규칙:

- item distance를 계산합니다.
- 해당 item 방향의 wall hit distance보다 멀면 그리지 않습니다.
- 보이는 sprite는 먼 것부터 가까운 것 순서로 그립니다.
- 크기는 거리 기반으로 줄이고 최소/최대 크기를 clamp합니다.

### 5. 클릭 마커는 UI이지 물체가 아니다

마커를 너무 물체처럼 그리면 공간이 장난감처럼 보입니다.

권장:

- 반투명 원형 마커
- hover/selected 때만 강조
- 텍스트는 짧게
- 실제 물체 sprite와 마커를 분리

### 6. 실제 panorama 모드는 별도 단계로 둔다

현재 앱의 강점은 도면 정확도입니다. 실제 360도 이미지 viewer를 붙이면 자연스러움은 좋아지지만, 도면 편집과 즉시 동기화되지는 않습니다.

추천 로드맵:

1. 현재 raycast viewer를 더 polished한 2.5D preview로 개선
2. 주요 지점별 AI/3D 생성 equirectangular image를 만들기
3. Photo Sphere Viewer 또는 Pannellum으로 실제 panorama mode 추가
4. 미니맵 좌표와 panorama hotspot을 연결
5. 시뮬레이션 장치와 향 상태는 overlay marker로 표시

## 이 프로젝트에 맞는 결론

단기적으로는 raycast viewer를 유지하는 것이 맞습니다. 이유는 도면 기반 장치 배치와 즉시 동기화되기 때문입니다.

다만 viewer를 덜 어색하게 만들려면 다음 순서로 개선하는 것이 좋습니다.

1. floor casting 또는 fake floor perspective 추가
2. wall texture atlas 추가
3. sprite occlusion 정교화
4. 미니맵 클릭 이동
5. selected marker/hover state 개선
6. 주요 지점별 실제 panorama mode 추가

실제 360도 사진 같은 결과가 목표라면 raycast만으로는 한계가 있습니다. 그 경우에는 Three.js sphere, Pannellum, Photo Sphere Viewer 중 하나를 도입하고, 도면 기반 preview와 panorama viewer를 별도 모드로 운영하는 편이 자연스럽습니다.
