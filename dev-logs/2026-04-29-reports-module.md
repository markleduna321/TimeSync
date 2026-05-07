# Reports Module

**Date:** 2026-04-29  
**Branch:** main (development)

## Summary

Implemented a full-featured Reports module for admin/manager roles covering payroll analytics, attendance, contributions, and department-level breakdowns — with Excel export, PNG chart download, and AI-powered insights via OpenAI.

## Backend

### `app/Services/ReportService.php`
- 5 report methods: `payrollSummary`, `payrollTrend`, `attendanceSummary`, `contributionsSummary`, `departmentPayroll`
- All methods accept `year`, optional `month`, optional `cutoff_type` filters

### `app/Services/OpenAiService.php`
- Wraps OpenAI Chat Completions API (`gpt-4o-mini`)
- System prompt: Senior HR/payroll analyst with DOLE/BIR context
- Sends compact JSON subset (top 10 rows) per report type to minimize tokens
- `OPENAI_API_KEY` and `OPENAI_MODEL` read from `.env`

### `app/Http/Controllers/Api/ReportController.php`
- 6 endpoints behind `authorizeAdmin()` guard (super_admin / admin / manager)
- `GET /api/reports/payroll-summary`
- `GET /api/reports/payroll-trend`
- `GET /api/reports/attendance`
- `GET /api/reports/contributions`
- `GET /api/reports/department-payroll`
- `POST /api/reports/ai-insights` (validates `report_type` enum + `data` array; catches RuntimeException → 502)

### `config/services.php`
- Added `openai.key` and `openai.model` entries

### `routes/api.php`
- Added `Route::prefix('reports')` group with all 6 endpoints

### `routes/web.php`
- Added `GET /admin/reports` → `Inertia::render('admin/reports/page')`

## Frontend

### `resources/js/features/reports/reportsApi.js`
- RTK Query API slice with 5 queries + 1 mutation (AI insights)
- Registered in `store/index.js`

### Section components (`resources/js/pages/admin/reports/_sections/`)
| File | Purpose |
|---|---|
| `ReportChart.jsx` | Chart.js wrapper (Bar, Line, Doughnut) with PNG download via `toBase64Image()` |
| `ExcelExportButton.jsx` | xlsx-based Excel export with optional column mapping |
| `AiInsightsPanel.jsx` | OpenAI insights panel with report type selector |
| `PayrollSummaryReport.jsx` | Per-employee payroll breakdown with chart + table |
| `PayrollTrendReport.jsx` | 12-month line chart + table |
| `AttendanceReport.jsx` | Attendance metrics with doughnut chart + color-coded rate badges |
| `ContributionsReport.jsx` | SSS/PhilHealth/Pag-IBIG/WHT split with grouped bar chart |
| `DepartmentPayrollReport.jsx` | Payroll by department with horizontal bar for >5 depts |

### `resources/js/pages/admin/reports/page.jsx`
- Ant Design `<Tabs>` orchestrator with 5 report tabs + AI Insights tab
- Shared filter state: Year (native select), Month (AntD Select), Cutoff (AntD Select — shown only on relevant tabs)
- `reportDataMap` state accumulated via `onDataLoad` callbacks; passed to `AiInsightsPanel`
- Persistent layout: `AdminReportsPage.layout = (page) => <MainLayout>{page}</MainLayout>`

## Packages Installed
- `chart.js` + `react-chartjs-2` — charting
- `xlsx` — client-side Excel export

## Build
- `npm run build` — ✅ clean, no errors or warnings
