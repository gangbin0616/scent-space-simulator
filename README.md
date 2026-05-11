# Scent Space Simulator

향수 팝업 스토어 안에서 향이 어떻게 퍼지는지 직접 배치하고 확인할 수 있는 웹 기반 공간 시뮬레이터입니다. 하나의 평면도 데이터를 기준으로 향 확산 시뮬레이션과 Three.js 3D 워크스루를 함께 제공해, 공간 디자인 과제나 전시 동선 분석에 참고할 수 있도록 만들었습니다.

## About

대학교 과제 도움을 위한 향기 공간 시뮬레이터입니다. 향의 출발점, 도착점, 가벽, 공기 순환 장치, 온도 장치를 배치하면서 공간 구성에 따라 향이 어떻게 이동하는지 시각적으로 비교할 수 있습니다.

## 주요 기능

- 평면도 기반 향 확산 시뮬레이션
- 여러 개의 향 출발점과 도착점 설정
- 가벽, 서큘레이터, 히터, 쿨러 배치 및 조정
- 향의 흐름을 막거나 통과시키는 도면 가벽 토글
- 목표 지점 평균 농도, 성공 기준, 경과 시간, 사용 예산 표시
- 같은 도면 좌표를 사용하는 Three.js 3D 워크스루
- WASD 이동, 마우스 드래그 시점 전환, 카메라 프리셋, 미니맵, 3D 오브젝트 클릭 설명

## 사용 방법

이 프로젝트는 별도 빌드 과정 없이 정적 웹 서버로 실행할 수 있습니다.

```powershell
python -m http.server 4173
```

브라우저에서 아래 주소로 접속합니다.

```txt
http://127.0.0.1:4173/#home
http://127.0.0.1:4173/#simulator
http://127.0.0.1:4173/#viewer
```

## 화면 구성

| 화면 | 설명 |
| --- | --- |
| `#home` | 프로젝트 소개와 주요 기능 요약 |
| `#simulator` | 향 출발점, 도착점, 장치, 가벽을 배치하는 시뮬레이션 작업대 |
| `#viewer` | 같은 평면도를 3D 공간으로 확인하는 워크스루 화면 |

## 프로젝트 구조

```txt
index.html
src/
  app.js          메인 UI, 시뮬레이터 제어, Three.js 뷰어
  floorplan.js    평면도 좌표와 벽 구조의 기준 데이터
  simulation.js   격자 기반 향 확산 계산 엔진
  styles.css      화면 스타일
  assets/         프로젝트 리소스
docs/
  ARCHITECTURE.md
  THREE_D_ROADMAP.md
  WEB_3D_REFERENCES.md
FLOORPLAN_SPEC.md
```

## 개발 확인

JavaScript 문법 확인은 아래 명령으로 진행할 수 있습니다.

```powershell
node --check src\floorplan.js
node --check src\simulation.js
node --check src\app.js
```

## 참고 문서

- [Architecture](docs/ARCHITECTURE.md): 현재 코드 구조와 데이터 흐름
- [3D Roadmap](docs/THREE_D_ROADMAP.md): Three.js 뷰어 개선 계획
- [Web 3D References](docs/WEB_3D_REFERENCES.md): 웹 3D 구현 참고 자료
- [Floorplan Spec](FLOORPLAN_SPEC.md): 좌표계와 평면도 작성 규칙

## 활용 예시

- 공간 디자인 수업에서 팝업 스토어 동선과 향 확산 흐름 설명
- 가벽 배치에 따른 향 도달률 비교
- 공기 순환 장치와 온도 장치가 향 확산에 주는 영향 시각화
- 발표 자료에 사용할 시뮬레이션 화면과 3D 공간 예시 제작
