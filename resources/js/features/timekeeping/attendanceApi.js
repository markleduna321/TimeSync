import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const attendanceApi = createApi({
    reducerPath: 'attendanceApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Attendance', 'Correction'],
    endpoints: (builder) => ({
        /**
         * Fetch the full calendar data for a month.
         * userId is optional — omit to use the authenticated user.
         */
        getCalendar: builder.query({
            query: ({ month, userId } = {}) => ({
                url: '/attendance',
                params: {
                    month,
                    ...(userId !== undefined && userId !== null ? { user_id: userId } : {}),
                },
            }),
            providesTags: (_r, _e, { month, userId } = {}) => [
                { type: 'Attendance', id: `${userId ?? 'me'}_${month}` },
            ],
        }),

        /**
         * List corrections. Pass { status: 'pending' | 'approved' | 'rejected' } to filter.
         */
        getCorrections: builder.query({
            query: (params = {}) => ({ url: '/attendance/corrections', params }),
            providesTags: [{ type: 'Correction', id: 'LIST' }],
        }),

        /**
         * File a correction. Accepts a FormData object (multipart — includes proof file).
         */
        fileCorrection: builder.mutation({
            query: (formData) => ({
                url: '/attendance/corrections',
                method: 'POST',
                body: formData,
                // Do NOT set Content-Type — browser sets it with the multipart boundary
                formData: true,
            }),
            invalidatesTags: (_r, _e, _args) => [
                'Attendance',
                { type: 'Correction', id: 'LIST' },
            ],
        }),

        /**
         * Approve or reject a correction.
         * { id, action: 'approved' | 'rejected', admin_note?: string }
         */
        reviewCorrection: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/attendance/corrections/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: [
                'Attendance',
                { type: 'Correction', id: 'LIST' },
            ],
        }),

        /**
         * Soft-delete a correction (admin/super_admin only) so the employee can re-file.
         * { id, deleted_reason: string }
         */
        removeCorrection: builder.mutation({
            query: ({ id, deleted_reason }) => ({
                url: `/attendance/corrections/${id}`,
                method: 'DELETE',
                body: { deleted_reason },
            }),
            invalidatesTags: [
                'Attendance',
                { type: 'Correction', id: 'LIST' },
            ],
        }),
    }),
});

export const {
    useGetCalendarQuery,
    useGetCorrectionsQuery,
    useFileCorrectionMutation,
    useReviewCorrectionMutation,
    useRemoveCorrectionMutation,
} = attendanceApi;
