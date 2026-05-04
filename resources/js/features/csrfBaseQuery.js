import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Reads the XSRF-TOKEN cookie set by Laravel and attaches it as the
 * X-XSRF-TOKEN header. RTK Query uses the native fetch API which —
 * unlike Axios — does not do this automatically.
 */
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

export function baseQueryWithCsrf(baseUrl) {
    return fetchBaseQuery({
        baseUrl,
        credentials: 'include',
        prepareHeaders: (headers) => {
            headers.set('Accept', 'application/json');
            const token = getCookie('XSRF-TOKEN');
            if (token) {
                headers.set('X-XSRF-TOKEN', token);
            }
            return headers;
        },
    });
}
