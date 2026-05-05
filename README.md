# Scent Space Simulator

향수 팝업 공간의 도면, 2.5D 뷰어, 향 확산 시뮬레이션을 한 화면에서 실험하는 정적 웹 앱입니다.

## 주요 기능

- `FLOORPLAN_SPEC.md` 기준의 단일 도면 데이터 사용
- 도면 기반 2.5D / 360도 스타일 뷰어
- 향별 확산 field를 분리한 다중 향 시뮬레이션
- 출발점 최대 10개, 도착점 최대 10개
- 출발점별 향 이름, 색상, 발향량, 퍼짐, 감쇠 조절
- 도착점별 전체 농도와 향별 농도 막대 표시
- 가벽, 서큘레이터, 온열 장치, 냉각 장치 배치
- 서큘레이터 흡입/토출, 온열 상승, 냉각 잔향 시각화

## 실행

```powershell
python -m http.server 4173
```

브라우저에서 아래 URL을 엽니다.

```txt
http://127.0.0.1:4173/#home
http://127.0.0.1:4173/#viewer
http://127.0.0.1:4173/#simulator
```

## 파일 구조

```txt
index.html
src/
  app.js
  floorplan.js
  simulation.js
  styles.css
  assets/
docs/
  PROJECT_DESCRIPTION.md
  WORK_COMPLETED.md
  DEVELOPMENT_GUIDELINES.md
  FUTURE_ROADMAP.md
  VIEWER_360_RESEARCH.md
```

## 핵심 설계 원칙

`src/floorplan.js`가 도면의 단일 진실 공급원입니다. 시뮬레이터와 2.5D 뷰어는 모두 같은 벽 데이터와 좌표계를 사용해야 합니다.
