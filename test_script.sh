if ! grep -q "onReevaluatePriorities" src/app-a/components/daily-reset/TodayExecutionScreen.tsx; then
  echo "Missing onReevaluatePriorities";
fi
