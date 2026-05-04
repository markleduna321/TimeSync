import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const breakConfigApi = createApi({
    reducerPath: 'breakConfigApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['BreakConfig'],
    endpoints: (builder) => ({
        getMyBreakConfig: builder.query({
            query: () => '/break-config/me',
            providesTags: ['BreakConfig'],
        }),
        getBreakConfig: builder.query({
            query: (userId) => `/break-config/${userId}`,
            providesTags: ['BreakConfig'],
        }),
        upsertBreakConfig: builder.mutation({
            query: ({ userId, ...body }) => ({
                url: `/break-config/${userId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['BreakConfig'],
        }),
    }),
});

export const {
    useGetMyBreakConfigQuery,
    useGetBreakConfigQuery,
    useUpsertBreakConfigMutation,
} = breakConfigApi;
