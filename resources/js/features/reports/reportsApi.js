import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const reportsApi = createApi({
    reducerPath: 'reportsApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Report'],
    endpoints: (builder) => ({

        getPayrollSummary: builder.query({
            query: (params = {}) => ({ url: '/reports/payroll-summary', params }),
            providesTags: [{ type: 'Report', id: 'PAYROLL_SUMMARY' }],
        }),

        getPayrollTrend: builder.query({
            query: (params = {}) => ({ url: '/reports/payroll-trend', params }),
            providesTags: [{ type: 'Report', id: 'PAYROLL_TREND' }],
        }),

        getAttendanceSummary: builder.query({
            query: (params = {}) => ({ url: '/reports/attendance', params }),
            providesTags: [{ type: 'Report', id: 'ATTENDANCE' }],
        }),

        getContributionsSummary: builder.query({
            query: (params = {}) => ({ url: '/reports/contributions', params }),
            providesTags: [{ type: 'Report', id: 'CONTRIBUTIONS' }],
        }),

        getDepartmentPayroll: builder.query({
            query: (params = {}) => ({ url: '/reports/department-payroll', params }),
            providesTags: [{ type: 'Report', id: 'DEPT_PAYROLL' }],
        }),

        getLeaveUtilization: builder.query({
            query: (params = {}) => ({ url: '/reports/leave-utilization', params }),
            providesTags: [{ type: 'Report', id: 'LEAVE_UTILIZATION' }],
        }),

        getAiInsights: builder.mutation({
            query: (body) => ({ url: '/reports/ai-insights', method: 'POST', body }),
        }),

    }),
});

export const {
    useGetPayrollSummaryQuery,
    useGetPayrollTrendQuery,
    useGetAttendanceSummaryQuery,
    useGetContributionsSummaryQuery,
    useGetDepartmentPayrollQuery,
    useGetLeaveUtilizationQuery,
    useGetAiInsightsMutation,
} = reportsApi;
