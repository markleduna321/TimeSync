<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAiService
{
    private string $key;
    private string $model;

    public function __construct()
    {
        $this->key   = config('services.openai.key', '');
        $this->model = config('services.openai.model', 'gpt-4o-mini');
    }

    /**
     * Analyze payroll/HR report data and return an AI-generated insight string.
     *
     * @param string $reportType  One of: payroll_summary, payroll_trend, attendance, contributions, department_payroll
     * @param array  $data        The structured report data to analyze
     * @return string
     */
    public function analyze(string $reportType, array $data): string
    {
        if (empty($this->key)) {
            throw new RuntimeException('OpenAI API key is not configured.');
        }

        $systemPrompt = <<<PROMPT
You are a senior HR and payroll analyst for a Philippine-based company operating under DOLE and BIR regulations (TRAIN Law, Labor Code).
Your role is to analyze payroll and attendance reports and provide actionable, concise insights.
Focus on: compensation trends, compliance risks, attendance anomalies, cost optimization, and workforce observations.
Use Philippine peso (₱) formatting. Be direct and professional. Respond in plain text paragraphs — no markdown headers, no bullet lists.
Limit your response to 4–6 sentences.
PROMPT;

        $userMessage = $this->buildUserMessage($reportType, $data);

        $response = Http::withToken($this->key)
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'       => $this->model,
                'max_tokens'  => 400,
                'temperature' => 0.4,
                'messages'    => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userMessage],
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('OpenAI API request failed: ' . $response->body());
        }

        return trim($response->json('choices.0.message.content') ?? '');
    }

    private function buildUserMessage(string $reportType, array $data): string
    {
        $labels = [
            'payroll_summary'    => 'Payroll Summary Report',
            'payroll_trend'      => 'Payroll Trend Report (12-month)',
            'attendance'         => 'Attendance Summary Report',
            'contributions'      => 'Government Contributions Report',
            'department_payroll' => 'Department Payroll Report',
        ];

        $label = $labels[$reportType] ?? $reportType;

        // Serialize only the most relevant top-level keys to keep token usage low
        $subset = match ($reportType) {
            'payroll_summary'    => [
                'total_gross'      => $data['total_gross'] ?? 0,
                'total_deductions' => $data['total_deductions'] ?? 0,
                'total_net'        => $data['total_net'] ?? 0,
                'headcount'        => $data['headcount'] ?? 0,
                'top_rows'         => array_slice($data['rows'] ?? [], 0, 10),
            ],
            'payroll_trend'      => $data,
            'attendance'         => [
                'total_days_scheduled' => $data['total_days_scheduled'] ?? 0,
                'total_days_worked'    => $data['total_days_worked'] ?? 0,
                'total_days_absent'    => $data['total_days_absent'] ?? 0,
                'total_late_minutes'   => $data['total_late_minutes'] ?? 0,
                'total_ot_minutes'     => $data['total_ot_minutes'] ?? 0,
                'top_rows'             => array_slice($data['rows'] ?? [], 0, 10),
            ],
            'contributions'      => $data,
            'department_payroll' => $data,
            default              => $data,
        };

        $json = json_encode($subset, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return "Please analyze the following {$label} data and provide HR insights:\n\n{$json}";
    }
}
