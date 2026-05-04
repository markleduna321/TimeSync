import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const timesheetApi = createApi({
    reducerPath: 'timesheetApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Timesheet', 'TimesheetSubject'],
    endpoints: (builder) => ({
        /**
         * Fetch all time logs for a given month for a target user.
         * userId defaults to the authenticated user on the server when omitted.
         */
        getTimesheetData: builder.query({
            query: ({ month, userId } = {}) => ({
                url: '/timesheets',
                params: {
                    month,
                    ...(userId !== undefined && userId !== null ? { user_id: userId } : {}),
                },
            }),
            providesTags: (_r, _e, { month, userId } = {}) => [
                { type: 'Timesheet', id: `${userId ?? 'me'}_${month}` },
            ],
        }),

        /**
         * Fetch the list of employees whose timesheets the caller may view.
         * Empty for plain employees (they only see themselves).
         */
        getTimesheetSubjects: builder.query({
            query: () => '/timesheets/subjects',
            providesTags: [{ type: 'TimesheetSubject', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetTimesheetDataQuery,
    useGetTimesheetSubjectsQuery,
} = timesheetApi;
