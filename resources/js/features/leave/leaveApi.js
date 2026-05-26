import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const leaveApi = createApi({
    reducerPath: 'leaveApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['LeaveApplication', 'LeaveCredit', 'LeaveType', 'LeaveMonetization'],
    endpoints: (builder) => ({

        /* ── Leave Types ───────────────────────────────── */

        getLeaveTypes: builder.query({
            query: () => '/leave/types',
            providesTags: ['LeaveType'],
        }),

        createLeaveType: builder.mutation({
            query: (body) => ({ url: '/leave/types', method: 'POST', body }),
            invalidatesTags: ['LeaveType'],
        }),

        updateLeaveType: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/leave/types/${id}`, method: 'PUT', body }),
            invalidatesTags: ['LeaveType'],
        }),

        deleteLeaveType: builder.mutation({
            query: (id) => ({ url: `/leave/types/${id}`, method: 'DELETE' }),
            invalidatesTags: ['LeaveType'],
        }),

        /* ── Leave Applications ────────────────────────── */

        getLeaveApplications: builder.query({
            query: (params = {}) => ({
                url: '/leave/applications',
                params,
            }),
            providesTags: ['LeaveApplication'],
        }),

        fileLeaveApplication: builder.mutation({
            query: (formData) => ({
                url: '/leave/applications',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['LeaveApplication', 'LeaveCredit'],
        }),

        reviewLeaveApplication: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/leave/applications/${id}/review`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['LeaveApplication', 'LeaveCredit'],
        }),

        cancelLeaveApplication: builder.mutation({
            query: (id) => ({ url: `/leave/applications/${id}`, method: 'DELETE' }),
            invalidatesTags: ['LeaveApplication', 'LeaveCredit'],
        }),

        /* ── Leave Credits ─────────────────────────────── */

        getMyLeaveCredits: builder.query({
            query: () => '/leave/credits/me',
            providesTags: ['LeaveCredit'],
        }),

        // Profile variant — returns { data: credits[], transactions: tx[] }
        getMyLeaveProfile: builder.query({
            query: () => ({ url: '/leave/credits/me', params: { include_transactions: 1 } }),
            providesTags: ['LeaveCredit'],
        }),

        getUserLeaveCredits: builder.query({
            query: ({ userId, year }) => ({
                url: `/admin/users/${userId}/leave-credits`,
                params: { year },
            }),
            providesTags: (result, error, { userId }) => [{ type: 'LeaveCredit', id: userId }],
        }),

        upsertLeaveCredit: builder.mutation({
            query: ({ userId, ...body }) => ({
                url: `/admin/users/${userId}/leave-credits`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { userId }) => [
                { type: 'LeaveCredit', id: userId },
                'LeaveCredit',
            ],
        }),

        assignLeaveType: builder.mutation({
            query: ({ userId, ...body }) => ({
                url: `/admin/users/${userId}/leave-credits/assign`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { userId }) => [
                { type: 'LeaveCredit', id: userId },
                'LeaveCredit',
            ],
        }),

        removeLeaveAssignment: builder.mutation({
            query: ({ userId, leaveTypeId, year }) => ({
                url: `/admin/users/${userId}/leave-credits/${leaveTypeId}`,
                method: 'DELETE',
                params: { year },
            }),
            invalidatesTags: (result, error, { userId }) => [
                { type: 'LeaveCredit', id: userId },
                'LeaveCredit',
            ],
        }),

        bulkAllocateCredits: builder.mutation({
            query: (body) => ({
                url: '/admin/leave-credits/bulk-allocate',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['LeaveCredit'],
        }),

        /* ── Leave Monetization ────────────────────────── */

        getLeaveMonetizations: builder.query({
            query: (params = {}) => ({ url: '/admin/leave-monetizations', params }),
            providesTags: ['LeaveMonetization'],
        }),

        runLeaveMonetization: builder.mutation({
            query: (body) => ({
                url: '/admin/leave-monetizations/run',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['LeaveMonetization'],
        }),

        processLeaveMonetization: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/admin/leave-monetizations/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['LeaveMonetization'],
        }),

        bulkProcessLeaveMonetizations: builder.mutation({
            query: (body) => ({
                url: '/admin/leave-monetizations/bulk-process',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['LeaveMonetization'],
        }),
    }),
});

export const {
    useGetLeaveTypesQuery,
    useCreateLeaveTypeMutation,
    useUpdateLeaveTypeMutation,
    useDeleteLeaveTypeMutation,
    useGetLeaveApplicationsQuery,
    useFileLeaveApplicationMutation,
    useReviewLeaveApplicationMutation,
    useCancelLeaveApplicationMutation,
    useGetMyLeaveCreditsQuery,
    useGetMyLeaveProfileQuery,
    useGetUserLeaveCreditsQuery,
    useUpsertLeaveCreditMutation,
    useAssignLeaveTypeMutation,
    useRemoveLeaveAssignmentMutation,
    useBulkAllocateCreditsMutation,
    useGetLeaveMonetizationsQuery,
    useRunLeaveMonetizationMutation,
    useProcessLeaveMonetizationMutation,
    useBulkProcessLeaveMonetizationsMutation,
} = leaveApi;
