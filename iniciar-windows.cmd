@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 24 em https://nodejs.org e abra este arquivo novamente.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0])===24?0:1)"
if errorlevel 1 (
  echo Este projeto usa Node.js 24. Instale essa versao e tente novamente.
  pause
  exit /b 1
)
echo Preparando o AgentScope Lab. Na primeira vez pode levar alguns minutos...
call npm ci
if errorlevel 1 goto fail
call npm run build
if errorlevel 1 goto fail
echo.
echo Quando aparecer o endereco abaixo, abra http://127.0.0.1:4310 no navegador.
echo Mantenha esta janela aberta enquanto usar o laboratorio.
call npm start
if errorlevel 1 goto fail
exit /b 0
:fail
echo.
echo Nao foi possivel iniciar. Confira a mensagem acima.
pause
exit /b 1
