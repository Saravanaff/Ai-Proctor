import useSWR from 'swr';
import axios from 'axios';
import { getTokenFromCookie } from '@/constants/AuthStore';

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Fetcher function for SWR with authentication
const fetcher = async (url: string) => {
  const token = getTokenFromCookie();
  const response = await axios.get(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
  return response.data;
};

/**
 * Hook for fetching dashboard statistics with caching
 */
export const useDashboardStats = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${baseURL}/dashboard/stats`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    stats: data?.data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
};

/**
 * Hook for fetching students with pagination and caching
 */
export const useStudents = (page: number = 1, limit: number = 10) => {
  const { data, error, isLoading, mutate } = useSWR(
    `${baseURL}/admin/students?page=${page}&limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    students: data?.data?.students || [],
    totalCount: data?.data?.totalCount || 0,
    totalPages: data?.data?.totalPages || 1,
    currentPage: data?.data?.currentPage || page,
    isLoading,
    isError: error,
    refresh: mutate,
  };
};

/**
 * Hook for fetching admins with pagination and caching
 */
export const useAdmins = (page: number = 1, limit: number = 10) => {
  const { data, error, isLoading, mutate } = useSWR(
    `${baseURL}/admin/emails?page=${page}&limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    admins: data?.data?.admins || [],
    totalCount: data?.data?.totalCount || 0,
    totalPages: data?.data?.totalPages || 1,
    currentPage: data?.data?.currentPage || page,
    isLoading,
    isError: error,
    refresh: mutate,
  };
};

/**
 * Hook for fetching student's attended exams with caching
 */
export const useStudentExams = (studentId: number | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    studentId ? `${baseURL}/admin/student/${studentId}/exams` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  return {
    exams: data?.data?.exams || [],
    count: data?.data?.count || 0,
    isLoading,
    isError: error,
    refresh: mutate,
  };
};

/**
 * Hook for fetching admin's exams with caching
 */
export const useAdminExams = (adminEmail: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    adminEmail ? `${baseURL}/admin/${adminEmail}/exams` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    admin: data?.data?.admin,
    exams: data?.data?.exams || [],
    totalExams: data?.data?.totalExams || 0,
    isLoading,
    isError: error,
    refresh: mutate,
  };
};
