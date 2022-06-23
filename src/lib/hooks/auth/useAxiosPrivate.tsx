import { useEffect } from 'react';
import { useAppSelector } from '../../../store/app/hooks';
import { selectUser } from '../../../store/auth/authSlice';
import { axiosPrivateInstance } from '../../api/axios';
import useRefreshToken from './useRefreshToken';

// https://axios-http.com/kr/docs/interceptors
function useAxiosPrivate() {
  const refresh = useRefreshToken();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    const requestIntercept = axiosPrivateInstance.interceptors.request.use(
      (config) => {
        // @ts-expect-error
        if (!config.headers['Authorization']) {
          // @ts-expect-error
          config.headers['Authorization'] = `Bearer ${user.token.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    const responseIntercept = axiosPrivateInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        if (error?.response?.status === 403 && !prevRequest?.sent) {
          // access token expired
          prevRequest.sent = true;
          const newAccessToken = await refresh();
          prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return axiosPrivateInstance(prevRequest);
        }
        return Promise.reject(error); // refresh token expired
      },
    );
    return () => {
      axiosPrivateInstance.interceptors.request.eject(requestIntercept);
      axiosPrivateInstance.interceptors.response.eject(responseIntercept);
    };
  }, [user, refresh]);
  return axiosPrivateInstance; // return instance including interceptors
}

export default useAxiosPrivate;
