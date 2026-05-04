import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const timelogApi = createApi({
    reducerPath: 'timelogApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['TimeLog'],
    endpoints: (builder) => ({
        getToday: builder.query({
            query: () => '/time-log/today',
            providesTags: ['TimeLog'],
        }),
        getHistory: builder.query({
            query: (params = {}) => ({ url: '/time-log/history', params }),
            providesTags: [{ type: 'TimeLog', id: 'HISTORY' }],
        }),
        clockIn: builder.mutation({
            query: () => ({ url: '/time-log/clock-in', method: 'POST' }),
            invalidatesTags: ['TimeLog'],
        }),
        clockOut: builder.mutation({
            query: () => ({ url: '/time-log/clock-out', method: 'POST' }),
            invalidatesTags: ['TimeLog'],
        }),
        lunchStart: builder.mutation({
            query: () => ({ url: '/time-log/lunch-start', method: 'POST' }),
            invalidatesTags: ['TimeLog'],
        }),
        lunchEnd: builder.mutation({
            query: () => ({ url: '/time-log/lunch-end', method: 'POST' }),
            invalidatesTags: ['TimeLog'],
        }),
        breakStart: builder.mutation({
            query: () => ({ url: '/time-log/break-start', method: 'POST' }),
            invalidatesTags: ['TimeLog'],
        }),
        breakEnd: builder.mutation({
            query: () => ({ url: '/time-log/break-end', method: 'POST' }),
            invalidatesTags: ['TimeLog'],
        }),
    }),
});

export const {
    useGetTodayQuery,
    useGetHistoryQuery,
    useClockInMutation,
    useClockOutMutation,
    useLunchStartMutation,
    useLunchEndMutation,
    useBreakStartMutation,
    useBreakEndMutation,
} = timelogApi;
