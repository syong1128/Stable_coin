@echo off
setlocal

echo [1/3] Ollama 모델 확인: qwen3:0.6b
echo 이미 받았다면 이 단계는 빠르게 지나갑니다.
ollama pull qwen3:0.6b

echo.
echo [2/3] DApp 서버 실행 준비
echo 브라우저 주소: http://localhost:3000

echo.
echo [3/3] 서버 실행
node server.js

endlocal
