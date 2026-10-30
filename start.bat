@echo off
echo ========================================================
echo  PREDICTIVE MAINTENANCE & MACHINE HEALTH MONITORING
echo  Theme: Black Background with Crimson Red Accents
echo  Dual ML: Random Forest & XGBoost with SHAP & RUL
echo  Worker Alert Email: nukameghan@gmail.com
echo ========================================================
echo.

echo Starting FastAPI Backend Server on port 8000...
start cmd /k "cd backend && python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Vite Frontend on port 5173...
start cmd /k "cd frontend && npm run dev"

echo.
echo Application is launching!
echo Frontend: http://localhost:5173
echo Backend API: http://127.0.0.1:8000/docs
echo ========================================================
pause
