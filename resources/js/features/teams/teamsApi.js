import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const teamsApi = createApi({
    reducerPath: 'teamsApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Team'],
    endpoints: (builder) => ({
        getTeams: builder.query({
            query: (params = {}) => ({ url: '/teams', params }),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Team', id })),
                        { type: 'Team', id: 'LIST' },
                    ]
                    : [{ type: 'Team', id: 'LIST' }],
        }),
        getTeam: builder.query({
            query: (id) => `/teams/${id}`,
            providesTags: (_r, _e, id) => [{ type: 'Team', id }],
        }),
        createTeam: builder.mutation({
            query: (body) => ({ url: '/teams', method: 'POST', body }),
            invalidatesTags: [{ type: 'Team', id: 'LIST' }],
        }),
        updateTeam: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/teams/${id}`, method: 'PATCH', body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Team', id }, { type: 'Team', id: 'LIST' }],
        }),
        deleteTeam: builder.mutation({
            query: (id) => ({ url: `/teams/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'Team', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetTeamsQuery,
    useGetTeamQuery,
    useCreateTeamMutation,
    useUpdateTeamMutation,
    useDeleteTeamMutation,
} = teamsApi;
