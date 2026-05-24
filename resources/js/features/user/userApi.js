import { api as baseApi } from '@/store';

export const userApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        uploadAvatar: builder.mutation({
            query: (file) => {
                const body = new FormData();
                body.append('avatar', file);
                return { url: '/user/avatar', method: 'POST', body };
            },
            invalidatesTags: ['User'],
        }),
        updateEmail: builder.mutation({
            query: (data) => ({ url: '/user/email', method: 'PATCH', body: data }),
            invalidatesTags: ['User'],
        }),
        updatePassword: builder.mutation({
            query: (data) => ({ url: '/user/password', method: 'PATCH', body: data }),
        }),
    }),
});

export const {
    useUploadAvatarMutation,
    useUpdateEmailMutation,
    useUpdatePasswordMutation,
} = userApi;
