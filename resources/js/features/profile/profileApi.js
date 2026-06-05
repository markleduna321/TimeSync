import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const profileApi = createApi({
    reducerPath: 'profileApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['MyProfile', 'Experiences', 'Documents'],
    endpoints: (builder) => ({

        /* ── Extended Profile ──────────────────────────────── */

        getMyProfile: builder.query({
            query: () => '/profile',
            providesTags: ['MyProfile'],
        }),

        updateMyProfile: builder.mutation({
            query: (body) => ({ url: '/profile', method: 'PUT', body }),
            invalidatesTags: ['MyProfile'],
        }),

        /* ── Experiences ───────────────────────────────────── */

        getMyExperiences: builder.query({
            query: () => '/profile/experiences',
            providesTags: ['Experiences'],
        }),

        addExperience: builder.mutation({
            query: (body) => ({ url: '/profile/experiences', method: 'POST', body }),
            invalidatesTags: ['Experiences'],
        }),

        updateExperience: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/profile/experiences/${id}`, method: 'PATCH', body }),
            invalidatesTags: ['Experiences'],
        }),

        deleteExperience: builder.mutation({
            query: (id) => ({ url: `/profile/experiences/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Experiences'],
        }),

        /* ── Documents ─────────────────────────────────────── */

        getMyDocuments: builder.query({
            query: () => '/profile/documents',
            // Upload also affects completion percentage
            providesTags: ['Documents'],
        }),

        uploadDocument: builder.mutation({
            query: (formData) => ({
                url: '/profile/documents',
                method: 'POST',
                body: formData,
                // Don't set Content-Type — let the browser set multipart boundary
                formData: true,
            }),
            // Resume upload changes completion %
            invalidatesTags: ['Documents', 'MyProfile'],
        }),

        deleteDocument: builder.mutation({
            query: (id) => ({ url: `/profile/documents/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Documents', 'MyProfile'],
        }),
    }),
});

export const {
    useGetMyProfileQuery,
    useUpdateMyProfileMutation,
    useGetMyExperiencesQuery,
    useAddExperienceMutation,
    useUpdateExperienceMutation,
    useDeleteExperienceMutation,
    useGetMyDocumentsQuery,
    useUploadDocumentMutation,
    useDeleteDocumentMutation,
} = profileApi;
