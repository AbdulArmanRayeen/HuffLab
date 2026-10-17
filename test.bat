@echo off
setlocal
title HuffLab - Round-trip Tests
cd /d "%~dp0"

where javac >nul 2>nul
if errorlevel 1 (
    echo ERROR: javac was not found. Install/configure a JDK first.
    pause
    exit /b 1
)

if not exist "out\core\HuffmanFileCompressor.class" (
    echo Compiling application classes first...
    if not exist "out" mkdir "out"
    if exist "sources.txt" del "sources.txt"
    for /r "src" %%F in (*.java) do echo "%%F" >> "sources.txt"
    javac -encoding UTF-8 -d "out" @"sources.txt"
    set "COMPILE_RESULT=%ERRORLEVEL%"
    del "sources.txt" >nul 2>nul
    if not "%COMPILE_RESULT%"=="0" (
        echo Application compilation failed.
        pause
        exit /b 1
    )
)

if not exist "tests\RoundTripTest.java" (
    echo ERROR: tests\RoundTripTest.java was not found.
    pause
    exit /b 1
)

echo Compiling round-trip tests...
javac -encoding UTF-8 -cp "out" -d "out" "tests\RoundTripTest.java"
if errorlevel 1 (
    echo Test compilation failed.
    pause
    exit /b 1
)

echo.
echo Running tests...
java -cp "out" RoundTripTest
set "TEST_RESULT=%ERRORLEVEL%"

echo.
if not "%TEST_RESULT%"=="0" (
    echo One or more tests failed.
) else (
    echo All round-trip tests passed.
)
pause
exit /b %TEST_RESULT%
