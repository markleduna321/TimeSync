import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const payrollApi = createApi({
    reducerPath: 'payrollApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Holiday', 'DeductionType', 'UserDeduction', 'Payslip', 'AllowanceType', 'UserAllowance'],
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
            query: () => '/deduction-types',
            providesTags: [{ type: 'DeductionType', id: 'LIST' }],
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
        getThirteenthMonth: builder.query({
            query: (params = {}) => ({ url: '/payslips/13th-month', params }),
        }),

        /* ── Allowance Types ───────────────────────────────────────── */
        getAllowanceTypes: builder.query({
            query: () => '/allowance-types',
            providesTags: [{ type: 'AllowanceType', id: 'LIST' }],
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
    }),
});

export const {
    useGetHolidaysQuery,
    useCreateHolidayMutation,
    useUpdateHolidayMutation,
    useDeleteHolidayMutation,
    useGetDeductionTypesQuery,
    useGetUserDeductionsQuery,
    useCreateUserDeductionMutation,
    useDeleteUserDeductionMutation,
    useGetPayslipsQuery,
    useGetPayslipQuery,
    useGeneratePayslipMutation,
    useReleasePayslipMutation,
    useDeletePayslipMutation,
    useGetThirteenthMonthQuery,
    useGetAllowanceTypesQuery,
    useGetUserAllowancesQuery,
    useCreateUserAllowanceMutation,
    useDeleteUserAllowanceMutation,
} = payrollApi;
