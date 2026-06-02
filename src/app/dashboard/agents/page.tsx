'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageContainer } from '@/components/layout/PageContainer';
import { AgentTable } from '@/components/agents/AgentTable';
import { AgentSlideOver } from '@/components/agents/AgentSlideOver';
import { useAgents } from '@/hooks/useAgents';
import type { SafeUser, CreateAgentRequest, UpdateAgentRequest } from '@/types';

export default function AgentsPage() {
  const {
    agents,
    loading,
    fetchAgents,
    createAgent,
    updateAgent,
    checkEmailAvailability,
  } = useAgents();

  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SafeUser | null>(null);
  const [deactivateDialog, setDeactivateDialog] = useState<SafeUser | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleCreate = () => {
    setEditingAgent(null);
    setSlideOverOpen(true);
  };

  const handleEdit = (agent: SafeUser) => {
    setEditingAgent(agent);
    setSlideOverOpen(true);
  };

  const handleSubmit = async (data: CreateAgentRequest | UpdateAgentRequest) => {
    if (editingAgent) {
      const result = await updateAgent(
        editingAgent._id.toString(),
        data as UpdateAgentRequest
      );
      if (result.success) {
        toast.success('Agent updated successfully');
      } else {
        toast.error(result.message || 'Failed to update agent');
      }
      return result;
    } else {
      const result = await createAgent(data as CreateAgentRequest);
      if (result.success) {
        toast.success('Agent created successfully');
      } else {
        toast.error(result.message || 'Failed to create agent');
      }
      return result;
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateDialog) return;

    setDeactivating(true);
    const result = await updateAgent(deactivateDialog._id.toString(), {
      isActive: false,
    });

    if (result.success) {
      toast.success(`${deactivateDialog.name} has been deactivated`);
      setDeactivateDialog(null);
    } else {
      toast.error(result.message || 'Failed to deactivate agent');
    }
    setDeactivating(false);
  };

  return (
    <PageContainer
      title="Agents"
      description="Manage your sales agents and their access."
      action={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      }
    >
      <AgentTable
        agents={agents}
        loading={loading}
        onEdit={handleEdit}
        onDeactivate={(agent) => setDeactivateDialog(agent)}
      />

      {/* Slide-over for create/edit */}
      <AgentSlideOver
        open={slideOverOpen}
        onClose={() => {
          setSlideOverOpen(false);
          setEditingAgent(null);
        }}
        onSubmit={handleSubmit}
        editAgent={editingAgent}
        checkEmail={checkEmailAvailability}
      />

      {/* Deactivation confirmation dialog */}
      <Dialog
        open={!!deactivateDialog}
        onOpenChange={(open) => {
          if (!open) setDeactivateDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Agent</DialogTitle>
            <DialogDescription>
              Deactivate{' '}
              <span className="font-semibold text-slate-900">
                {deactivateDialog?.name}
              </span>
              ? They will lose access and cannot receive new leads. This action
              can be reversed later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateDialog(null)}
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
