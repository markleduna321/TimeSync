import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query/react';
import { createApi } from '@reduxjs/toolkit/query/react';
import uiReducer from '@/features/ui/uiSlice';
import { timelogApi } from '@/features/timekeeping/timelogApi';
import { scheduleApi } from '@/features/timekeeping/scheduleApi';
import { breakConfigApi } from '@/features/timekeeping/breakConfigApi';
import { baseQueryWithCsrf } from '@/features/csrfBaseQuery';

// Base RTK Query API - extend this from `features/*` later.
export const api = createApi({
	reducerPath: 'api',
	baseQuery: baseQueryWithCsrf('/api'),
	tagTypes: ['User'],
	endpoints: (builder) => ({
		getUser: builder.query({
			query: () => '/user',
			providesTags: ['User'],
		}),
	}),
});

export const { useGetUserQuery } = api;

const store = configureStore({
	reducer: {
		ui: uiReducer,
		[api.reducerPath]: api.reducer,
		[timelogApi.reducerPath]: timelogApi.reducer,
		[scheduleApi.reducerPath]: scheduleApi.reducer,
		[breakConfigApi.reducerPath]: breakConfigApi.reducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware().concat(
			api.middleware,
			timelogApi.middleware,
			scheduleApi.middleware,
			breakConfigApi.middleware,
		),
});

setupListeners(store.dispatch);

export default store;

