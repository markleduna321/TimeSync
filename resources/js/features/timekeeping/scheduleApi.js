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
        getSchedules: builder.query({
            query: () => '/schedules',
            providesTags: ['Schedule'],
        }),
        upsertSchedule: builder.mutation({
            query: ({ userId, ...body }) => ({
                url: `/schedules/${userId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Schedule'],
        }),
    }),
});

export const {
    useGetMyScheduleQuery,
    useGetSchedulesQuery,
    useUpsertScheduleMutation,
} = scheduleApi;
