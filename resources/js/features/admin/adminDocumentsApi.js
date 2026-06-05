import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const adminDocumentsApi = createApi({
    reducerPath: 'adminDocumentsApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['AdminDocuments'],
    endpoints: (builder) => ({
        getAdminUserDocuments: builder.query({
            query: (userId) => `/admin/users/${userId}/documents`,
            providesTags: (result, error, userId) => [{ type: 'AdminDocuments', id: userId }],
        }),
        uploadAdminDocument: builder.mutation({
            query: ({ userId, formData }) => ({
                url: `/admin/users/${userId}/documents`,
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: (result, error, { userId }) => [{ type: 'AdminDocuments', id: userId }],
        }),
        deleteAdminDocument: builder.mutation({
            query: ({ userId, documentId }) => ({
                url: `/admin/users/${userId}/documents/${documentId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { userId }) => [{ type: 'AdminDocuments', id: userId }],
        }),
    }),
});

export const {
    useGetAdminUserDocumentsQuery,
    useUploadAdminDocumentMutation,
    useDeleteAdminDocumentMutation,
} = adminDocumentsApi;
