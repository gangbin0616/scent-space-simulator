# 앞으로 할 수 있는 것들

## UX 개선

- 선택한 source/target을 패널 상단에 고정하는 inspector 추가
- 마우스 휠 줌과 캔버스 팬 기능 추가
- 장치 배치 시 ghost preview 표시
- source/target 이름 인라인 편집 개선
- target 농도 순위, 경고, 목표 농도 도달 여부 표시
- undo/redo 추가

## 시뮬레이션 개선

- 시간 배속 조절
- 확산 해상도 선택
- source별 on/off 토글
- target별 목표 농도 설정
- fan 강도와 범위 조절
- heater/cooler 반경과 강도 조절
- 농도 히스토리 그래프
- 향별 혼합 비율 분석

## 2.5D / 360도 뷰 개선

- 벽면 텍스처 atlas 적용
- floor casting으로 바닥 패턴 추가
- sprite 기반 향수병, 장치, 표지판 배치
- 미니맵 클릭으로 카메라 이동
- 도면 위 지점별 viewer snapshot 저장
- 실제 equirectangular panorama 또는 cubemap viewer 모드 추가

## 제품화

- 프로젝트 저장/불러오기 JSON
- 배치안 export/import
- PNG 또는 PDF 리포트 출력
- 향별 도착 농도 리포트 생성
- Vercel 또는 GitHub Pages 배포
- 테스트 자동화 추가

## 데이터 모델

- `floorplan.js` 좌표 데이터를 JSON schema로 분리
- 장치와 source/target을 project state로 저장
- preset library 추가
- 사용자 정의 향 preset 저장

