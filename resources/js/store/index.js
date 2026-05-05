import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query/react';
import { createApi } from '@reduxjs/toolkit/query/react';
import uiReducer from '@/features/ui/uiSlice';
import { timelogApi } from '@/features/timekeeping/timelogApi';
import { scheduleApi } from '@/features/timekeeping/scheduleApi';
import { breakConfigApi } from '@/features/timekeeping/breakConfigApi';
import { timesheetApi } from '@/features/timekeeping/timesheetApi';
import { attendanceApi } from '@/features/timekeeping/attendanceApi';
import { usersApi } from '@/features/users/usersApi';
import { teamsApi } from '@/features/teams/teamsApi';
import { rolesApi } from '@/features/roles/rolesApi';
import { payrollApi } from '@/features/payroll/payrollApi';
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
		[timesheetApi.reducerPath]: timesheetApi.reducer,
		[attendanceApi.reducerPath]: attendanceApi.reducer,
		[usersApi.reducerPath]: usersApi.reducer,
		[teamsApi.reducerPath]: teamsApi.reducer,
		[rolesApi.reducerPath]: rolesApi.reducer,
		[payrollApi.reducerPath]: payrollApi.reducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware().concat(
			api.middleware,
			timelogApi.middleware,
			scheduleApi.middleware,
			breakConfigApi.middleware,
			timesheetApi.middleware,
			attendanceApi.middleware,
			usersApi.middleware,
			teamsApi.middleware,
			rolesApi.middleware,
			payrollApi.middleware,
		),
});

setupListeners(store.dispatch);

export default store;
