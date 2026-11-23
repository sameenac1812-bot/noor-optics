@echo off
title Noor Optics - Thermal Printer Daemon
cd /d "%~dp0pos-daemon"
call start-pos.bat "POS-80"
