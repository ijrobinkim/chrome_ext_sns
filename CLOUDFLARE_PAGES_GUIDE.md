# ☁️ Cloudflare Pages 100% 무료 프론트엔드 호스팅 배포 가이드

이 프로젝트의 게시판 페이지(`collected.html`) 및 정적 웹사이트를 **Cloudflare Pages**에 무제한 무료로 호스팅하고 배포하는 방법입니다.

---

## ⚡ 1. 준비 사항
1. [Cloudflare 가입](https://dash.cloudflare.com/sign-up) (100% 무료)
2. [GitHub 계정](https://github.com) 및 이 코드 저장소 (Repository)

---

## 🚀 2. Cloudflare Pages 배포 방법 (3단계)

### 1단계: Cloudflare 대시보드 접속
1. [Cloudflare 대시보드](https://dash.cloudflare.com) 로그인
2. 왼쪽 메뉴 ➔ **Workers 및 Pages** 클릭
3. **[애플리케이션 생성]** ➔ **Pages** 탭 선택 ➔ **[Git에 연결]** 클릭

### 2단계: GitHub 저장소 선택
1. GitHub 계정 인증 후 현재 소스코드 저장소(`ChromeExtSns`) 선택
2. **[설치 및 시작]** 클릭

### 3단계: 빌드 설정 및 배포
- **프로젝트 이름**: `sns-shopping-board` (자유롭게 입력)
- **프로덕션 브랜치**: `main` 또는 `master`
- **프레임워크 프리셋**: `None` (정적 HTML/JS 프로젝트)
- **빌드 출력 디렉터리**: `/` (루트 폴더)
- **[저장하고 배포하기]** 버튼 클릭!

🎉 **약 1분 후 생성되는 무료 웹 URL (예: `https://sns-shopping-board.pages.dev/collected.html`)로 전세계 어디서나 웹 접속이 가능해집니다!**

---

## 🌐 3. 커스텀 도메인 연결 (무료)
- `myboard.com` 같은 개인 도메인이 있다면 **Cloudflare Pages ➔ [사용자 지정 도메인]**에서 무료 SSL 인증서와 함께 연결할 수 있습니다.

---

## 🗄️ 4. 데이터베이스 연동 (Cloudflare Workers / D1)
- 게시판 데이터를 완전 서버리스 SQL로 구동하고 싶으시면, Cloudflare 대시보드의 **D1 데이터베이스** (무료 매일 10만 회) 기능을 클릭 한 번으로 바인딩하여 사용할 수 있습니다.
