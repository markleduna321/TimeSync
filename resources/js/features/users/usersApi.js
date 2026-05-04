import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const usersApi = createApi({
    reducerPath: 'usersApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['User'],
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
