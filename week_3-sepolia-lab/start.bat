@echo off
echo ========================================
echo  GIWA Sepolia Lab - 서버 시작
echo ========================================
echo.

:: node_modules가 없으면 npm install 실행
if not exist "node_modules" (
  echo [1/2] 의존성 설치 중...
  npm install
  echo.
)

:: .env 파일이 없으면 안내
if not exist ".env" (
  echo [!] .env 파일이 없습니다.
  echo     .env.example을 복사해서 .env로 만들고 개인키를 입력하세요.
  echo.
  copy .env.example .env >nul
  echo     .env 파일이 생성되었습니다. 편집 후 다시 실행하세요.
  pause
  exit /b
)

echo [2/2] 서버 시작...
echo.
node server.js
pause
