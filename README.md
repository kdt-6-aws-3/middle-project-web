# PetClinic React WEB

Apache가 React 화면을 제공하고, 브라우저의 `/api/*` 요청만 내부 ALB를 통해 WAS(Spring Boot)로 전달합니다. API 요청 형식은 팀의 최신 API 명세를 따릅니다.

## 로컬 실행

```powershell
npm install
npm run dev
```

화면: `http://localhost:5173/petclinic/`

개발 서버는 `/api/*`를 `http://192.168.91.29:8080/api/*`로 프록시합니다. 팀 WAS가 실행 중이어야 보호자·반려동물·방문 기록·수의사 데이터가 표시됩니다. 예시 데이터나 브라우저 저장 모드는 없습니다. WAS가 준비되지 않았다면 API 화면에 연결 오류가 표시됩니다.

## Apache 배포

```powershell
npm run build
```

`dist` **안의 파일**을 Apache의 `/var/www/html/petclinic/`에 배치합니다. 기존 정적 소개 페이지 `/var/www/html/index.html`은 별도로 유지할 수 있습니다. Apache의 `/api/` 프록시 대상은 내부 ALB DNS와 실제 리스너 포트로 지정합니다.

```apache
ProxyPass        "/api/" "http://INTERNAL-ALB-DNS:8080/api/"
ProxyPassReverse "/api/" "http://INTERNAL-ALB-DNS:8080/api/"
```

기존 `/petclinic/` 전체를 WAS로 보내는 ProxyPass 규칙은 React 경로와 겹치므로 제거해야 합니다. 내부 ALB는 WAS의 `/actuator/health`를 대상 그룹 헬스 체크 경로로 사용할 수 있습니다.

## 지원 화면

- 보호자 검색·페이지 이동·등록·수정·상세 조회
- 반려동물 등록·수정 및 방문 예약 기록
- 수의사 목록

등록·수정은 실제 API로 전송됩니다. 서버의 검증 오류는 Problem Details의 메시지로 표시합니다.

반려동물 이름은 같은 보호자 안에서도 중복할 수 있습니다. 화면은 이름이 아닌 반려동물 ID로 상세 조회와 수정을 구분합니다.
