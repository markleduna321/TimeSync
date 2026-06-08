import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const usersApi = createApi({
    reducerPath: 'usersApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['User'],
    // Do not retain the cache after components unmount (e.g. on logout/login
    // the Redux store persists across Inertia SPA navigations, so stale
    // cross-session data would be served to the next logged-in user).
    keepUnusedDataFor: 0,
    endpoints: (builder) => ({
        getUsers: builder.query({
            query: (params = {}) => ({ url: '/admin/users', params }),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'User', id })),
                        { type: 'User', id: 'LIST' },
                    ]
                    : [{ type: 'User', id: 'LIST' }],
            // Refresh live "current_status" data every 90s. RTK Query
            // automatically pauses polling when the tab is hidden, so this
            // only runs while the user is actually looking at the page.
            pollingInterval: 90_000,
            refetchOnFocus: true,
            refetchOnReconnect: true,
        }),
        getUser: builder.query({
            query: (id) => `/admin/users/${id}`,
            providesTags: (_r, _e, id) => [{ type: 'User', id }],
        }),
        createUser: builder.mutation({
            query: (body) => ({ url: '/admin/users', method: 'POST', body }),
            invalidatesTags: [{ type: 'User', id: 'LIST' }],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/admin/users/${id}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({ url: `/admin/users/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'User', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetUsersQuery,
    useGetUserQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
} = usersApi;
