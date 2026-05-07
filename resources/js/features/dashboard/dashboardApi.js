import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const dashboardApi = createApi({
    reducerPath: 'dashboardApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['AdminKpis', 'AdminActivity'],
    endpoints: (builder) => ({

        getAdminKpis: builder.query({
            query: () => '/dashboard/admin-kpis',
            providesTags: [{ type: 'AdminKpis', id: 'SUMMARY' }],
        }),

        getAdminActivity: builder.query({
            query: () => '/dashboard/admin-activity',
            providesTags: [{ type: 'AdminActivity', id: 'FEED' }],
        }),

        getEmployeeKpis: builder.query({
            query: () => '/dashboard/employee-kpis',
            providesTags: [{ type: 'AdminKpis', id: 'EMPLOYEE' }],
        }),

    }),
});

export const {
    useGetAdminKpisQuery,
    useGetAdminActivityQuery,
    useGetEmployeeKpisQuery,
} = dashboardApi;
