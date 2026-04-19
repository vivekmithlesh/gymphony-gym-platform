import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  CheckCircle,
  Trash2,
  Mail,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { BackButton } from "./BackButton";
import { deleteMemberApi } from "@/server/api/members/delete";
import { listMembers } from "@/server/api/members/list";
import { updateMemberApi } from "@/server/api/members/update";
import type { MemberListResponse, MemberRow } from "@/types/gym.types";

export function MembersList() {
  return <MembersListContent />;
}

function MembersListContent() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page] = useState(1);
  const [pageSize] = useState(20);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const membersQuery = useQuery<MemberListResponse>({
    queryKey: ["members", page, pageSize],
    queryFn: () => listMembers({ data: { page, pageSize } }),
  });

  const filteredMembers = (membersQuery.data?.members ?? []).filter((member: MemberRow) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);
    const matchesFilter =
      filterStatus === "all" || member.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const updateMemberMutation = useMutation({
    mutationFn: updateMemberApi,
    onSuccess: async (_, variables) => {
      const member = membersQuery.data?.members.find((m) => m.id === variables.data.memberId);
      await queryClient.invalidateQueries({ queryKey: ["members", 1, 20] });
      toast.success(`${member?.name ?? "Member"} updated successfully`, {
        position: "bottom-center",
      });
    },
    onSettled: () => {
      setPendingAction(null);
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: deleteMemberApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members", 1, 20] });
      toast.success("Member deleted successfully", {
        position: "bottom-center",
      });
    },
    onSettled: () => {
      setPendingAction(null);
    },
  });

  const handleActivateMember = (member: MemberRow, action: "edit" | "mark-paid") => {
    setPendingAction(`${action}-${member.id}`);
    updateMemberMutation.mutate({
      data: {
        memberId: member.id,
        status: "ACTIVE",
      },
    });
  };

  const handleDeleteMember = (member: MemberRow) => {
    if (!window.confirm("Delete this member?")) {
      return;
    }

    setPendingAction(`delete-${member.id}`);
    deleteMemberMutation.mutate({
      data: {
        memberId: member.id,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <BackButton />
      </div>
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-slate-200 rounded-xl focus:ring-primary/20 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[180px] bg-white border-slate-200 rounded-xl text-slate-900">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900">
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Member Name
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Plan Type
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Next Due
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membersQuery.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`loading-${i}`} className="border-b border-slate-100">
                    <td className="px-6 py-4">
                      <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="ml-auto h-8 w-8 rounded-lg bg-slate-100 animate-pulse" />
                    </td>
                  </tr>
                ))}
              {membersQuery.isError && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-red-600">
                    Failed to load members. Please refresh and try again.
                  </td>
                </tr>
              )}
              {filteredMembers.map((member, i) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-brand flex items-center justify-center font-bold text-[10px] text-white">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="font-semibold text-slate-900">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{member.phone}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{member.plan}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{member.dueDate}</td>
                  <td className="px-6 py-4">
                    <Badge
                      className={`rounded-full px-2.5 py-0.5 border-none font-bold text-[10px] shadow-sm ${
                        member.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40 bg-white border-slate-200 text-slate-900 rounded-xl p-1 shadow-elegant"
                      >
                        <DropdownMenuItem
                          disabled={pendingAction !== null}
                          onClick={() => handleActivateMember(member, "edit")}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-medium">
                            {pendingAction === `edit-${member.id}` ? "Updating..." : "Edit"}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingAction !== null}
                          onClick={() => handleActivateMember(member, "mark-paid")}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-50 cursor-pointer text-green-600"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            {pendingAction === `mark-paid-${member.id}` ? "Updating..." : "Mark Paid"}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingAction !== null}
                          onClick={() => handleDeleteMember(member)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            {pendingAction === `delete-${member.id}` ? "Deleting..." : "Delete"}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {!membersQuery.isLoading && !membersQuery.isError && filteredMembers.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-muted-foreground">No members found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
