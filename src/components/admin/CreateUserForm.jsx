"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createUser, listAllStructures } from "@/actions/admin/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    phone: "",
    role: "user",
    structureIds: [],
  });

  useEffect(() => {
    async function fetchStructures() {
      try {
        const result = await listAllStructures();
        if (result.success) {
          setStructures(result.structures);
        } else {
          toast.error("Failed to load structures");
        }
      } catch (error) {
        toast.error("Failed to load structures");
      } finally {
        setLoadingStructures(false);
      }
    }
    fetchStructures();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleStructureToggle = (structureId) => {
    setFormData((prev) => {
      const current = prev.structureIds;
      if (current.includes(structureId)) {
        return {
          ...prev,
          structureIds: current.filter((id) => id !== structureId),
        };
      }
      return { ...prev, structureIds: [...current, structureId] };
    });
  };

  const removeStructure = (structureId) => {
    setFormData((prev) => ({
      ...prev,
      structureIds: prev.structureIds.filter((id) => id !== structureId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      if (!formData.email || !formData.password) {
        toast.error("Email and password are required");
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      const result = await createUser(formData);

      if (result.success) {
        toast.success("User created successfully");
        router.push("/admin/users");
      } else {
        toast.error(result.error || "Failed to create user");
      }
    } catch (error) {
      toast.error("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
          <CardDescription>
            Create a new user account with email and password authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="John Doe"
                value={formData.displayName}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="structure_admin">Structure Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Users can view and manage records. Structure Admins can also
              manage other users within their structures.
            </p>
          </div>

          {/* Structure Selection */}
          <div className="space-y-4">
            <div>
              <Label>Structures</Label>
              <p className="text-sm text-muted-foreground">
                Select which structures this user can access.
              </p>
            </div>

            {/* Selected structures badges */}
            {formData.structureIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.structureIds.map((id) => {
                  const structure = structures.find((s) => s.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {structure?.name || id}
                      <button
                        type="button"
                        onClick={() => removeStructure(id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Structure list */}
            {loadingStructures ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading structures...
              </div>
            ) : structures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No structures available.
              </p>
            ) : (
              <div className="grid gap-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                {structures.map((structure) => (
                  <div
                    key={structure.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`structure-${structure.id}`}
                      checked={formData.structureIds.includes(structure.id)}
                      onCheckedChange={() =>
                        handleStructureToggle(structure.id)
                      }
                    />
                    <label
                      htmlFor={`structure-${structure.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {structure.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/users")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
