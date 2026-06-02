'use client';

import { useState, useCallback } from 'react';
import type { SafeUser, CreateAgentRequest, UpdateAgentRequest, ApiResponse } from '@/types';

export function useAgents() {
  const [agents, setAgents] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async (activeOnly = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = activeOnly ? '?activeOnly=true' : '';
      const res = await fetch(`/api/agents${params}`);
      const data: ApiResponse<SafeUser[]> = await res.json();

      if (data.success && data.data) {
        setAgents(data.data);
      } else {
        setError(data.message || 'Failed to fetch agents');
      }
    } catch {
      setError('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (agentData: CreateAgentRequest): Promise<ApiResponse<SafeUser>> => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });
    const data: ApiResponse<SafeUser> = await res.json();

    if (data.success && data.data) {
      // Optimistic update — prepend to list
      setAgents((prev) => [data.data!, ...prev]);
    }

    return data;
  }, []);

  const updateAgent = useCallback(async (
    id: string,
    updateData: UpdateAgentRequest
  ): Promise<ApiResponse<SafeUser>> => {
    // Optimistic update
    setAgents((prev) =>
      prev.map((agent) =>
        agent._id.toString() === id ? { ...agent, ...updateData } as SafeUser : agent
      )
    );

    const res = await fetch(`/api/agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const data: ApiResponse<SafeUser> = await res.json();

    if (!data.success) {
      // Revert optimistic update on failure
      await fetchAgents();
    } else if (data.data) {
      setAgents((prev) =>
        prev.map((agent) =>
          agent._id.toString() === id ? data.data! : agent
        )
      );
    }

    return data;
  }, [fetchAgents]);

  const checkEmailAvailability = useCallback(async (email: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/agents/check-email?email=${encodeURIComponent(email)}`);
      const data: ApiResponse<{ available: boolean }> = await res.json();
      return data.success && data.data?.available === true;
    } catch {
      return false;
    }
  }, []);

  return {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    checkEmailAvailability,
  };
}
