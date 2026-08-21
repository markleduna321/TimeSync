import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const payrollApi = createApi({
    reducerPath: 'payrollApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Holiday', 'DeductionType', 'UserDeduction', 'Payslip', 'AllowanceType', 'UserAllowance', 'UserGovDeduction', 'UserPaySetting'],
    endpoints: (builder) => ({

        /* ── Holidays ──────────────────────────────────────────────── */
        getHolidays: builder.query({
            query: (params = {}) => ({ url: '/holidays', params }),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Holiday', id })),
                        { type: 'Holiday', id: 'LIST' },
                    ]
                    : [{ type: 'Holiday', id: 'LIST' }],
        }),
        createHoliday: builder.mutation({
            query: (body) => ({ url: '/holidays', method: 'POST', body }),
            invalidatesTags: [{ type: 'Holiday', id: 'LIST' }],
        }),
        updateHoliday: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/holidays/${id}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Holiday', id }, { type: 'Holiday', id: 'LIST' }],
        }),
        deleteHoliday: builder.mutation({
            query: (id) => ({ url: `/holidays/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'Holiday', id: 'LIST' }],
        }),

        /* ── Deduction Types ───────────────────────────────────────── */
        getDeductionTypes: builder.query({
            query: (params = {}) => ({ url: '/deduction-types', params }),
            providesTags: (result) =>
                result?.data
                    ? [...result.data.map(({ id }) => ({ type: 'DeductionType', id })), { type: 'DeductionType', id: 'LIST' }]
                    : [{ type: 'DeductionType', id: 'LIST' }],
        }),
        createDeductionType: builder.mutation({
            query: (body) => ({ url: '/deduction-types', method: 'POST', body }),
            invalidatesTags: [{ type: 'DeductionType', id: 'LIST' }],
        }),
        updateDeductionType: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/deduction-types/${id}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: 'DeductionType', id }, { type: 'DeductionType', id: 'LIST' }],
        }),
        deleteDeductionType: builder.mutation({
            query: (id) => ({ url: `/deduction-types/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'DeductionType', id: 'LIST' }],
        }),

        /* ── User Deductions ───────────────────────────────────────── */
        getUserDeductions: builder.query({
            query: (userId) => `/users/${userId}/deductions`,
            providesTags: (_r, _e, userId) => [{ type: 'UserDeduction', id: `user-${userId}` }],
        }),
        createUserDeduction: builder.mutation({
            query: ({ userId, ...body }) => ({ url: `/users/${userId}/deductions`, method: 'POST', body }),
            invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserDeduction', id: `user-${userId}` }],
        }),
        deleteUserDeduction: builder.mutation({
            query: ({ userId, deductionId }) => ({ url: `/users/${userId}/deductions/${deductionId}`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserDeduction', id: `user-${userId}` }],
        }),

        /* ── Payslips ──────────────────────────────────────────────── */
        getPayslips: builder.query({
            query: (params = {}) => ({ url: '/payslips', params }),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Payslip', id })),
                        { type: 'Payslip', id: 'LIST' },
                    ]
                    : [{ type: 'Payslip', id: 'LIST' }],
        }),
        getPayslip: builder.query({
            query: (id) => `/payslips/${id}`,
            providesTags: (_r, _e, id) => [{ type: 'Payslip', id }],
        }),
        generatePayslip: builder.mutation({
            query: (body) => ({ url: '/payslips', method: 'POST', body }),
            invalidatesTags: [{ type: 'Payslip', id: 'LIST' }],
        }),
        releasePayslip: builder.mutation({
            query: (id) => ({ url: `/payslips/${id}/release`, method: 'PATCH' }),
            invalidatesTags: (_r, _e, id) => [{ type: 'Payslip', id }, { type: 'Payslip', id: 'LIST' }],
        }),
        deletePayslip: builder.mutation({
            query: (id) => ({ url: `/payslips/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'Payslip', id: 'LIST' }],
        }),
        bulkDraftPayslips: builder.mutation({
            query: (body) => ({ url: '/payslips/bulk-draft', method: 'POST', body }),
            invalidatesTags: [{ type: 'Payslip', id: 'LIST' }],
        }),
        bulkReleasePayslips: builder.mutation({
            query: (body) => ({ url: '/payslips/bulk-release', method: 'POST', body }),
            invalidatesTags: [{ type: 'Payslip', id: 'LIST' }],
        }),
        getThirteenthMonth: builder.query({
            query: (params = {}) => ({ url: '/payslips/13th-month', params }),
        }),

        /* ── 13th Month Pay (admin manage) ─────────────────────────── */
        getThirteenthMonths: builder.query({
            query: (params = {}) => ({ url: '/13th-month', params }),
            providesTags: [{ type: 'Payslip', id: 'LIST' }],
        }),
        generateThirteenthMonths: builder.mutation({
            query: (body) => ({ url: '/13th-month/generate', method: 'POST', body }),
            invalidatesTags: [{ type: 'Payslip', id: 'LIST' }],
        }),

        /* ── Allowance Types ───────────────────────────────────────── */
        getAllowanceTypes: builder.query({
            query: (params = {}) => ({ url: '/allowance-types', params }),
            providesTags: (result) =>
                result?.data
                    ? [...result.data.map(({ id }) => ({ type: 'AllowanceType', id })), { type: 'AllowanceType', id: 'LIST' }]
                    : [{ type: 'AllowanceType', id: 'LIST' }],
        }),
        createAllowanceType: builder.mutation({
            query: (body) => ({ url: '/allowance-types', method: 'POST', body }),
            invalidatesTags: [{ type: 'AllowanceType', id: 'LIST' }],
        }),
        updateAllowanceType: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/allowance-types/${id}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: 'AllowanceType', id }, { type: 'AllowanceType', id: 'LIST' }],
        }),
        deleteAllowanceType: builder.mutation({
            query: (id) => ({ url: `/allowance-types/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'AllowanceType', id: 'LIST' }],
        }),

        /* ── User Allowances ───────────────────────────────────────── */
        getUserAllowances: builder.query({
            query: (userId) => `/users/${userId}/allowances`,
            providesTags: (_r, _e, userId) => [{ type: 'UserAllowance', id: `user-${userId}` }],
        }),
        createUserAllowance: builder.mutation({
            query: ({ userId, ...body }) => ({ url: `/users/${userId}/allowances`, method: 'POST', body }),
            invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserAllowance', id: `user-${userId}` }],
        }),
        deleteUserAllowance: builder.mutation({
            query: ({ userId, allowanceId }) => ({ url: `/users/${userId}/allowances/${allowanceId}`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserAllowance', id: `user-${userId}` }],
        }),

        /* ── Government Contribution Toggles ───────────────────────── */
        getUserGovDeductions: builder.query({
            query: (userId) => `/users/${userId}/government-deductions`,
            providesTags: (_r, _e, userId) => [{ type: 'UserGovDeduction', id: `user-${userId}` }],
        }),
        updateUserGovDeduction: builder.mutation({
            query: ({ userId, code, ...body }) => ({ url: `/users/${userId}/government-deductions/${code}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserGovDeduction', id: `user-${userId}` }],
        }),

        /* ── Pay Setting Toggles (Night Diff / Holiday Pay) ──────────── */
        getUserPaySettings: builder.query({
            query: (userId) => `/users/${userId}/pay-settings`,
            providesTags: (_r, _e, userId) => [{ type: 'UserPaySetting', id: `user-${userId}` }],
        }),
        updateUserPaySetting: builder.mutation({
            query: ({ userId, code, ...body }) => ({ url: `/users/${userId}/pay-settings/${code}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserPaySetting', id: `user-${userId}` }],
        }),
    }),
});

export const {
    useGetHolidaysQuery,
    useCreateHolidayMutation,
    useUpdateHolidayMutation,
    useDeleteHolidayMutation,
    useGetDeductionTypesQuery,
    useCreateDeductionTypeMutation,
    useUpdateDeductionTypeMutation,
    useDeleteDeductionTypeMutation,
    useGetUserDeductionsQuery,
    useCreateUserDeductionMutation,
    useDeleteUserDeductionMutation,
    useGetPayslipsQuery,
    useGetPayslipQuery,
    useGeneratePayslipMutation,
    useReleasePayslipMutation,
    useDeletePayslipMutation,
    useBulkDraftPayslipsMutation,
    useBulkReleasePayslipsMutation,
    useGetThirteenthMonthQuery,
    useGetThirteenthMonthsQuery,
    useGenerateThirteenthMonthsMutation,
    useGetAllowanceTypesQuery,
    useCreateAllowanceTypeMutation,
    useUpdateAllowanceTypeMutation,
    useDeleteAllowanceTypeMutation,
    useGetUserAllowancesQuery,
    useCreateUserAllowanceMutation,
    useDeleteUserAllowanceMutation,
    useGetUserGovDeductionsQuery,
    useUpdateUserGovDeductionMutation,
    useGetUserPaySettingsQuery,
    useUpdateUserPaySettingMutation,
} = payrollApi;
