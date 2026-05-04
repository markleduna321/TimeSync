import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const scheduleApi = createApi({
    reducerPath: 'scheduleApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Schedule'],
    endpoints: (builder) => ({
        getMySchedule: builder.query({
            query: () => '/schedule/me',
            providesTags: ['Schedule'],
        }),

        /**
         * Admin/manager/team_lead: paginated list of users with their schedules.
         * Returns UserResource collection (each item has a `schedule` key).
         */
        getUsersWithSchedules: builder.query({
            query: (params = {}) => ({ url: '/schedules', params }),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Schedule', id })),
                        { type: 'Schedule', id: 'LIST' },
                    ]
                    : [{ type: 'Schedule', id: 'LIST' }],
        }),

        upsertSchedule: builder.mutation({
            query: ({ userId, ...body }) => ({
                url: `/schedules/${userId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { userId }) => [
                { type: 'Schedule', id: userId },
                { type: 'Schedule', id: 'LIST' },
            ],
        }),
    }),
});

export const {
    useGetMyScheduleQuery,
    useGetUsersWithSchedulesQuery,
    useUpsertScheduleMutation,
} = scheduleApi;
