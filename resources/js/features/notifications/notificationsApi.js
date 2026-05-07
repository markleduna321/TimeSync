import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

export const notificationsApi = createApi({
    reducerPath: 'notificationsApi',
    baseQuery: baseQueryWithCsrf('/api'),
    tagTypes: ['Notification', 'NotificationCount'],
    endpoints: (builder) => ({
        getNotifications: builder.query({
            query: () => '/notifications',
            providesTags: ['Notification'],
        }),

        getUnreadCount: builder.query({
            query: () => '/notifications/count',
            providesTags: ['NotificationCount'],
        }),

        markRead: builder.mutation({
            query: (id) => ({
                url: `/notifications/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Notification', 'NotificationCount'],
        }),

        markAllRead: builder.mutation({
            query: () => ({
                url: '/notifications/read-all',
                method: 'POST',
            }),
            invalidatesTags: ['Notification', 'NotificationCount'],
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useGetUnreadCountQuery,
    useMarkReadMutation,
    useMarkAllReadMutation,
} = notificationsApi;
