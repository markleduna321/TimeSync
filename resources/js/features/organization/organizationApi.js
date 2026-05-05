import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const organizationApi = createApi({
    reducerPath: 'organizationApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Department', 'Account'],
    endpoints: (builder) => ({

        /* ── Departments ──────────────────────────────────────────── */
        getDepartments: builder.query({
            query: (params = {}) => ({ url: '/departments', params }),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Department', id })),
                        { type: 'Department', id: 'LIST' },
                    ]
                    : [{ type: 'Department', id: 'LIST' }],
        }),
        createDepartment: builder.mutation({
            query: (body) => ({ url: '/departments', method: 'POST', body }),
            invalidatesTags: [{ type: 'Department', id: 'LIST' }],
        }),
        updateDepartment: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/departments/${id}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'Department', id },
                { type: 'Department', id: 'LIST' },
            ],
        }),
        deleteDepartment: builder.mutation({
            query: (id) => ({ url: `/departments/${id}`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, id) => [
                { type: 'Department', id },
                { type: 'Department', id: 'LIST' },
            ],
        }),

        /* ── Accounts ─────────────────────────────────────────────── */
        getAccounts: builder.query({
            query: (params = {}) => ({ url: '/accounts', params }),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Account', id })),
                        { type: 'Account', id: 'LIST' },
                    ]
                    : [{ type: 'Account', id: 'LIST' }],
        }),
        createAccount: builder.mutation({
            query: (body) => ({ url: '/accounts', method: 'POST', body }),
            invalidatesTags: [{ type: 'Account', id: 'LIST' }],
        }),
        updateAccount: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/accounts/${id}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'Account', id },
                { type: 'Account', id: 'LIST' },
            ],
        }),
        deleteAccount: builder.mutation({
            query: (id) => ({ url: `/accounts/${id}`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, id) => [
                { type: 'Account', id },
                { type: 'Account', id: 'LIST' },
            ],
        }),
    }),
});

export const {
    useGetDepartmentsQuery,
    useCreateDepartmentMutation,
    useUpdateDepartmentMutation,
    useDeleteDepartmentMutation,
    useGetAccountsQuery,
    useCreateAccountMutation,
    useUpdateAccountMutation,
    useDeleteAccountMutation,
} = organizationApi;
