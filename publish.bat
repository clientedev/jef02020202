@echo off
echo =========================================
echo Nucleo 1.03 - Deploy Facilitador
echo =========================================
echo.

echo [1/3] Preparando arquivos...
git add .

echo [2/3] Criando commit de atualizacao...
git commit -m "Update: Implementacao de Importacao Excel e correcoes na Agenda Operacional"

echo [3/3] Enviando para o Railway...
echo.
echo DICA: Se o comando 'railway' nao funcionar, certifique-se de que o Railway CLI esta instalado.
echo Alternativamente, voce pode usar 'git push railway main' se configurado.
echo.

railway up

echo.
echo =========================================
echo Processo de deploy iniciado!
echo Acompanhe o progresso no painel do Railway.
echo As migrasoes do banco serao aplicadas automaticamente no boot.
echo =========================================
pause
