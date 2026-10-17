@echo off
setlocal
title HuffLab - Offline File Compressor
cd /d "%~dp0"

echo.
echo ==========================================
echo       HUFFLAB - OFFLINE COMPRESSOR
echo ==========================================
echo.

where java >nul 2>nul
if errorlevel 1 (
    echo ERROR: java was not found in PATH.
    echo Install a JDK and configure JAVA_HOME/PATH.
    pause
    exit /b 1
)

where javac >nul 2>nul
if errorlevel 1 (
    echo ERROR: javac was not found in PATH.
    echo A JDK is required.
    pause
    exit /b 1
)

if not exist "src\Main.java" (
    echo ERROR: src\Main.java was not found.
    echo Place run.bat in the project root folder.
    pause
    exit /b 1
)

if not exist "web\index.html" (
    echo ERROR: web\index.html was not found.
    pause
    exit /b 1
)

if not exist "out" mkdir "out"
if exist "sources.txt" del "sources.txt"

for /r "src" %%F in (*.java) do echo "%%F" >> "sources.txt"

echo [1/2] Compiling project...
javac -encoding UTF-8 -d "out" @"sources.txt"
set "COMPILE_RESULT=%ERRORLEVEL%"
del "sources.txt" >nul 2>nul

if not "%COMPILE_RESULT%"=="0" (
    echo.
    echo COMPILATION FAILED. Fix the errors above.
    pause
    exit /b 1
)

echo.
echo [2/2] Starting HuffLab...
echo Open http://localhost:8080 in your browser.
echo Keep this window open while using the application.
echo Press Ctrl+C to stop.
echo.

java -cp "out" Main

echo.
echo HuffLab has stopped.
pause
