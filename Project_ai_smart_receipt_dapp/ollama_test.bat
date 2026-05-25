@echo off
curl http://localhost:11434/api/generate -d "{\"model\":\"qwen3:0.6b\",\"prompt\":\"KMU Cafe에서 8000 mKRW를 결제한 내용을 짧은 스마트 영수증으로 요약해줘.\",\"stream\":false}"
