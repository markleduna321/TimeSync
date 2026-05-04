import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const rolesApi = createApi({
    reducerPath: 'rolesApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Role'],
    endpoints: (builder) => ({
        getRoles: builder.query({
            query: () => '/roles',
            providesTags: [{ type: 'Role', id: 'LIST' }],
        }),
    }),
});

export const { useGetRolesQuery } = rolesApi;
